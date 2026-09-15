import "server-only";

import { and, asc, count, eq, gt, gte, isNull, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { inventoryItems, inventoryPublicMedia, inventoryReservations, type InventoryReservation } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { publicPaixaoClutchPredicate } from "./public-clutch";
import {
  canonicalizeInventoryReservationLockId,
  InventoryItemUnavailableError,
  InventoryReservationConflictError,
  inventoryReservationBlockingPredicate,
  requireInventoryReservationActor,
} from "./reservations";
import {
  publicClutchRentalDecisionSchema,
  publicClutchRentalRequestSchema,
  type PublicClutchRentalDecisionInput,
  type PublicClutchRentalRequestInput,
  type PublicRentalReservationResult,
} from "./public-rental-reservation-schema";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function publicItemQuery(reader: Pick<typeof db, "select">, slug: string) {
  return reader.select({ id: inventoryItems.id }).from(inventoryItems)
    .innerJoin(inventoryPublicMedia, eq(inventoryPublicMedia.inventoryItemId, inventoryItems.id))
    .where(and(publicPaixaoClutchPredicate(), eq(inventoryItems.paixaoClutchSlug, slug))).limit(1);
}

async function lockItem(tx: Transaction, inventoryItemId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${canonicalizeInventoryReservationLockId(inventoryItemId)}))`);
}

function overlapPredicate(inventoryItemId: string, startsOn: string, endsOn: string, now: Date) {
  return and(
    eq(inventoryReservations.inventoryItemId, inventoryItemId),
    inventoryReservationBlockingPredicate(now),
    lte(inventoryReservations.startsOn, endsOn),
    gte(inventoryReservations.endsOn, startsOn),
  );
}

export async function createPublicClutchRentalReservation(
  input: PublicClutchRentalRequestInput,
): Promise<PublicRentalReservationResult> {
  const parsed = publicClutchRentalRequestSchema.parse(input);
  const guestPhone = z.string().regex(/^\d{8,15}$/, "telefone inválido").parse(parsed.guestPhone.replace(/\D/g, ""));

  return db.transaction(async (tx) => {
    // Serialize this phone across items before counting requests, then acquire
    // the same item lock used by internal reservations and staff decisions.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`public-rental-phone:${guestPhone}`}))`);
    const [candidate] = await publicItemQuery(tx, parsed.slug);
    if (!candidate) throw new InventoryItemUnavailableError();
    await lockItem(tx, candidate.id);
    const [item] = await publicItemQuery(tx, parsed.slug).for("update");
    if (!item || item.id !== candidate.id) throw new InventoryItemUnavailableError();

    const now = new Date();
    const [recentRequests] = await tx.select({ count: count() }).from(inventoryReservations).where(and(
      eq(inventoryReservations.guestPhone, guestPhone),
      eq(inventoryReservations.purpose, "rental"),
      isNull(inventoryReservations.shootId),
      gt(inventoryReservations.createdAt, new Date(now.getTime() - 60 * 60 * 1000)),
    ));
    if ((recentRequests?.count ?? 0) >= 3) throw new Error("limite de solicitações atingido; tente novamente mais tarde");

    const [conflict] = await tx.select({ id: inventoryReservations.id }).from(inventoryReservations)
      .where(overlapPredicate(item.id, parsed.startsOn, parsed.endsOn, now)).limit(1);
    if (conflict) throw new InventoryReservationConflictError();

    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const [reservation] = await tx.insert(inventoryReservations).values({
      inventoryItemId: item.id,
      shootId: null,
      purpose: "rental",
      status: "pending",
      startsOn: parsed.startsOn,
      endsOn: parsed.endsOn,
      guestName: parsed.guestName,
      guestPhone,
      guestEmail: parsed.guestEmail || null,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    }).returning();
    if (!reservation) throw new Error("falha ao criar reserva");

    await recordAuditEvent({
      actorUserId: null,
      action: "inventory_reservation.created",
      entityType: "inventory_reservation",
      entityId: reservation.id,
      after: { inventoryItemId: item.id, purpose: "rental", status: "pending", startsOn: parsed.startsOn, endsOn: parsed.endsOn, expiresAt },
    }, tx);

    return { reservationCode: reservation.id, status: "pending", expiresAt: expiresAt.toISOString() };
  });
}

export async function listPublicClutchUnavailableRanges(slug: string): Promise<{ startsOn: string; endsOn: string }[]> {
  const parsedSlug = z.string().trim().min(1).max(160).parse(slug);
  const [item] = await publicItemQuery(db, parsedSlug);
  if (!item) return [];
  return db.select({ startsOn: inventoryReservations.startsOn, endsOn: inventoryReservations.endsOn })
    .from(inventoryReservations)
    .where(and(eq(inventoryReservations.inventoryItemId, item.id), inventoryReservationBlockingPredicate(new Date())))
    .orderBy(asc(inventoryReservations.startsOn), asc(inventoryReservations.endsOn));
}

export async function decidePublicClutchRentalReservation(
  input: PublicClutchRentalDecisionInput,
  actorUserId: string,
): Promise<InventoryReservation> {
  const parsed = publicClutchRentalDecisionSchema.parse(input);
  await requireInventoryReservationActor(actorUserId);

  return db.transaction(async (tx) => {
    const publicReservation = and(
      eq(inventoryReservations.id, parsed.reservationId),
      eq(inventoryReservations.purpose, "rental"),
      isNull(inventoryReservations.shootId),
    );
    const [candidate] = await tx.select().from(inventoryReservations).where(publicReservation).limit(1);
    if (!candidate) throw new Error("reserva inexistente ou não alterável");
    await lockItem(tx, candidate.inventoryItemId);
    const [current] = await tx.select().from(inventoryReservations).where(publicReservation).limit(1).for("update");
    const now = new Date();
    if (!current || current.inventoryItemId !== candidate.inventoryItemId || current.purpose !== "rental" || current.shootId !== null ||
        (current.status !== "pending" && current.status !== "confirmed")) {
      throw new Error("reserva inexistente ou não alterável");
    }

    if (parsed.decision === "approve") {
      if (current.status !== "pending" || !current.expiresAt || current.expiresAt <= now) {
        throw new Error("reserva expirada ou não aprovável");
      }
      const [conflict] = await tx.select({ id: inventoryReservations.id }).from(inventoryReservations)
        .where(and(overlapPredicate(current.inventoryItemId, current.startsOn, current.endsOn, now), ne(inventoryReservations.id, current.id))).limit(1);
      if (conflict) throw new InventoryReservationConflictError();
    }

    const status = parsed.decision === "approve" ? "confirmed" : "released";
    const [reservation] = await tx.update(inventoryReservations).set({
      status,
      expiresAt: null,
      updatedAt: now,
      ...(status === "released" ? { cancelledAt: now, cancelledByUserId: actorUserId } : {}),
    }).where(publicReservation).returning();
    if (!reservation) throw new Error("falha ao alterar reserva");
    await recordAuditEvent({
      actorUserId,
      action: `inventory_reservation.${status}`,
      entityType: "inventory_reservation",
      entityId: reservation.id,
      before: { status: current.status, expiresAt: current.expiresAt },
      after: { status, expiresAt: null, ...(status === "released" ? { cancelledAt: now, cancelledByUserId: actorUserId } : {}) },
    }, tx);
    return reservation;
  });
}
