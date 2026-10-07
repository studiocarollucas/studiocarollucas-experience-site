import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { inventoryItems, inventoryReservations, stylingReferences } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import {
  canonicalizeInventoryReservationLockId,
  requireInventoryReservationActor,
} from "@/domain/inventory/reservations";
import type { PortalReference } from "@/domain/portal/types";

const activeReservationStates = ["pending", "confirmed"] as const;
const uuid = z.string().uuid().transform((value) => value.toLowerCase());
const linkInputSchema = z.object({
  shootId: uuid,
  referenceId: uuid,
  inventoryItemId: uuid.nullable(),
});

const errorMessages = {
  invalid_input: "Dados inválidos para vincular a referência.",
  unauthorized: "Ator não autorizado para vincular referências ao acervo.",
  reference_not_found: "Referência não encontrada neste ensaio.",
  reservation_required: "A peça precisa de uma reserva ou preferência ativa neste ensaio.",
} as const;

export class StylingInventoryLinkError extends Error {
  constructor(public readonly code: keyof typeof errorMessages) {
    super(errorMessages[code]);
    this.name = "StylingInventoryLinkError";
  }
}

export async function linkStylingReferenceToInventoryItem(
  input: { shootId: string; referenceId: string; inventoryItemId: string | null },
  actorUserId: string,
): Promise<void> {
  try {
    await requireInventoryReservationActor(actorUserId);
  } catch {
    throw new StylingInventoryLinkError("unauthorized");
  }
  const parsed = linkInputSchema.safeParse(input);
  if (!parsed.success) throw new StylingInventoryLinkError("invalid_input");
  const { shootId, referenceId, inventoryItemId } = parsed.data;

  await db.transaction(async (tx) => {
    if (inventoryItemId !== null) {
      // Match the preference/reservation writers' item lock before taking row locks.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${canonicalizeInventoryReservationLockId(inventoryItemId)}))`);
    }
    const referencePredicate = and(
      eq(stylingReferences.id, referenceId),
      eq(stylingReferences.shootId, shootId),
    );
    const [reference] = await tx
      .select({ id: stylingReferences.id, shootId: stylingReferences.shootId, inventoryItemId: stylingReferences.inventoryItemId })
      .from(stylingReferences)
      .where(referencePredicate)
      .limit(1)
      .for("update");
    if (!reference || reference.id !== referenceId || reference.shootId !== shootId) {
      throw new StylingInventoryLinkError("reference_not_found");
    }

    if (inventoryItemId !== null) {
      // Cancellation UPDATEs take this row lock too. A cancelled reservation
      // cannot pass validation while this link is being saved.
      const [reservation] = await tx
        .select({
          shootId: inventoryReservations.shootId,
          inventoryItemId: inventoryReservations.inventoryItemId,
          purpose: inventoryReservations.purpose,
          status: inventoryReservations.status,
        })
        .from(inventoryReservations)
        .where(and(
          eq(inventoryReservations.shootId, shootId),
          eq(inventoryReservations.inventoryItemId, inventoryItemId),
          eq(inventoryReservations.purpose, "shoot"),
          inArray(inventoryReservations.status, activeReservationStates),
        ))
        .limit(1)
        .for("update");
      if (!reservation || reservation.shootId !== shootId || reservation.inventoryItemId !== inventoryItemId
        || reservation.purpose !== "shoot" || (reservation.status !== "pending" && reservation.status !== "confirmed")) {
        throw new StylingInventoryLinkError("reservation_required");
      }
    }

    if (reference.inventoryItemId === inventoryItemId) return;
    await tx.update(stylingReferences).set({ inventoryItemId }).where(referencePredicate);
    await recordAuditEvent({
      actorUserId,
      action: inventoryItemId === null ? "styling_reference.unlinked" : "styling_reference.linked",
      entityType: "styling_reference",
      entityId: referenceId,
      before: { inventoryItemId: reference.inventoryItemId },
      after: { inventoryItemId },
    }, tx);
  });
}

/** Enrich only references the caller has already read under the portal's RLS. */
export async function readStylingInventoryLinks(
  shootId: string,
  references: PortalReference[],
): Promise<PortalReference[]> {
  const referenceIds = references.filter((reference) => reference.shootId === shootId).map((reference) => reference.id);
  const links = new Map<string, NonNullable<PortalReference["inventoryLink"]>>();
  if (referenceIds.length > 0) {
    const rows = await db
      .select({
        referenceId: stylingReferences.id,
        shootId: stylingReferences.shootId,
        inventoryItemId: inventoryItems.id,
        itemName: inventoryItems.name,
        reservationState: inventoryReservations.status,
      })
      .from(stylingReferences)
      .innerJoin(inventoryItems, eq(inventoryItems.id, stylingReferences.inventoryItemId))
      .innerJoin(inventoryReservations, eq(inventoryReservations.inventoryItemId, inventoryItems.id))
      .where(and(
        eq(stylingReferences.shootId, shootId),
        inArray(stylingReferences.id, referenceIds),
        eq(inventoryReservations.shootId, shootId),
        eq(inventoryReservations.purpose, "shoot"),
        inArray(inventoryReservations.status, activeReservationStates),
      ));
    const authorizedIds = new Set(referenceIds);
    for (const row of rows) {
      if (row.shootId !== shootId || !authorizedIds.has(row.referenceId)
        || (row.reservationState !== "pending" && row.reservationState !== "confirmed")) continue;
      if (links.get(row.referenceId)?.reservationState === "confirmed") continue;
      links.set(row.referenceId, {
        inventoryItemId: row.inventoryItemId,
        itemName: row.itemName,
        reservationState: row.reservationState,
      });
    }
  }
  return references.map((reference) => ({
    ...reference,
    inventoryLink: reference.shootId === shootId ? links.get(reference.id) ?? null : null,
  }));
}
