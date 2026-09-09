import "server-only";

import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryReservations, profiles, type InventoryReservation } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import {
  createShootInventoryReservationSchema,
  type CreateShootInventoryReservationInput,
} from "./reservation-schema";

const blockingStatuses = ["pending", "confirmed"] as const;

export class InventoryReservationConflictError extends Error {
  constructor() {
    super("conflito de reserva");
    this.name = "InventoryReservationConflictError";
  }
}

export function canonicalizeInventoryReservationLockId(id: string): string {
  return id.toLowerCase();
}

async function requireInventoryReservationActor(actorUserId: string): Promise<void> {
  const [actor] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, actorUserId))
    .limit(1);

  if (!actor || (actor.role !== "staff" && actor.role !== "admin")) {
    throw new Error("ator não autorizado para reservas de acervo");
  }
}

export async function createShootInventoryReservation(
  input: CreateShootInventoryReservationInput,
  actorUserId: string,
): Promise<InventoryReservation> {
  const parsed = createShootInventoryReservationSchema.parse(input);
  await requireInventoryReservationActor(actorUserId);

  return db.transaction(async (tx) => {
    // The lock is transaction-scoped, so concurrent reservations for this item
    // cannot both observe the same availability window before either inserts.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${canonicalizeInventoryReservationLockId(parsed.inventoryItemId)}))`);

    const [conflict] = await tx
      .select({ id: inventoryReservations.id })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.inventoryItemId, parsed.inventoryItemId),
          inArray(inventoryReservations.status, blockingStatuses),
          lte(inventoryReservations.startsOn, parsed.endsOn),
          gte(inventoryReservations.endsOn, parsed.startsOn),
        ),
      )
      .limit(1);

    if (conflict && !parsed.overrideConflict) {
      throw new InventoryReservationConflictError();
    }

    const isApprovedOverride = Boolean(conflict && parsed.overrideConflict);
    const [reservation] = await tx
      .insert(inventoryReservations)
      .values({
        inventoryItemId: parsed.inventoryItemId,
        shootId: parsed.shootId,
        purpose: "shoot",
        startsOn: parsed.startsOn,
        endsOn: parsed.endsOn,
        status: "confirmed",
        ...(isApprovedOverride
          ? {
              overrideReason: parsed.overrideReason,
              overriddenByUserId: actorUserId,
              overriddenAt: new Date(),
            }
          : {}),
      })
      .returning();

    if (!reservation) throw new Error("falha ao criar reserva");

    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_reservation.created",
        entityType: "inventory_reservation",
        entityId: reservation.id,
        after: {
          inventoryItemId: reservation.inventoryItemId,
          shootId: reservation.shootId,
          startsOn: reservation.startsOn,
          endsOn: reservation.endsOn,
          status: reservation.status,
          overrideReason: reservation.overrideReason,
        },
      },
      tx,
    );

    return reservation;
  });
}

export async function cancelInventoryReservation(
  id: string,
  actorUserId: string,
  shootId: string,
): Promise<InventoryReservation> {
  await requireInventoryReservationActor(actorUserId);

  return db.transaction(async (tx) => {
    const cancelledAt = new Date();
    const [reservation] = await tx
      .update(inventoryReservations)
      .set({
        status: "cancelled",
        cancelledAt,
        cancelledByUserId: actorUserId,
        updatedAt: cancelledAt,
      })
      .where(
        and(
          eq(inventoryReservations.id, id),
          eq(inventoryReservations.shootId, shootId),
          inArray(inventoryReservations.status, blockingStatuses),
        ),
      )
      .returning();

    if (!reservation) throw new Error("reserva inexistente ou não cancelável");

    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_reservation.cancelled",
        entityType: "inventory_reservation",
        entityId: reservation.id,
        after: {
          status: reservation.status,
          cancelledAt: reservation.cancelledAt,
          cancelledByUserId: reservation.cancelledByUserId,
        },
      },
      tx,
    );

    return reservation;
  });
}

export async function listReservationsForShoot(shootId: string): Promise<InventoryReservation[]> {
  return db
    .select()
    .from(inventoryReservations)
    .where(eq(inventoryReservations.shootId, shootId))
    .orderBy(desc(inventoryReservations.startsOn));
}
