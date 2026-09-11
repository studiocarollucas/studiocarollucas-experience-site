import "server-only";

import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryItems, inventoryPublicMedia, type InventoryItem } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { requireInventoryCatalogActor } from "./authorization";
import { lockCuration } from "./curation-lock";
import { withFutureInventoryReservations, type FutureInventoryReservation } from "./queries";
import {
  type PaixaoClutchAdminFilters,
  type UpdatePaixaoClutchInput,
  updatePaixaoClutchSchema,
  reorderPaixaoClutchSchema,
  type ReorderPaixaoClutchInput,
} from "./clutch-schema";

export { uploadInventoryPublicMedia, promoteInventoryMedia, removeInventoryPublicMedia, readInventoryPublicMedia } from "./public-media";

function assertPublishable(item: InventoryItem, input: ReturnType<typeof updatePaixaoClutchSchema.parse>): void {
  if (item.type !== "clutch") throw new Error("somente clutches podem participar da curadoria Paixão Clutch");
  if (!input.published) return;
  if (!input.eligible) throw new Error("publicação exige elegibilidade para Paixão Clutch");
  if (!item.active || item.status !== "available") {
    throw new Error("item indisponível não pode ser publicado na Paixão Clutch");
  }
  if (!input.rentalPrice || !input.copy || !item.paixaoClutchPublicImagePath) {
    throw new Error("publicação da Paixão Clutch exige preço de aluguel, copy e imagem pública");
  }
}

export async function updatePaixaoClutch(
  input: UpdatePaixaoClutchInput,
  actorUserId: string,
): Promise<InventoryItem> {
  const parsed = updatePaixaoClutchSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);

  return db.transaction(async (tx) => {
    await lockCuration(tx);
    const [before] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, parsed.itemId))
      .limit(1)
      .for("update");
    if (!before) throw new Error("item de acervo inexistente");
    assertPublishable(before, parsed);
    if (parsed.published) {
      const [media] = await tx.select().from(inventoryPublicMedia).where(and(
        eq(inventoryPublicMedia.inventoryItemId, parsed.itemId),
        eq(inventoryPublicMedia.publicPath, before.paixaoClutchPublicImagePath!),
        eq(inventoryPublicMedia.state, "ready"),
      )).limit(1);
      if (!media) throw new Error("Publicação exige imagem pública confirmada pelo acervo.");
    }

    const [item] = await tx
      .update(inventoryItems)
      .set({
        // This is a complete editorial form, so an omitted optional value clears it.
        rentalPrice: parsed.rentalPrice ?? null,
        replacementValue: parsed.replacementValue ?? null,
        paixaoClutchCopy: parsed.copy || null,
        paixaoClutchEligible: parsed.eligible,
        paixaoClutchPublished: parsed.published,
        paixaoClutchFeatured: parsed.featured,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, parsed.itemId))
      .returning();
    if (!item) throw new Error("item de acervo inexistente");

    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_item.paixao_clutch_updated",
        entityType: "inventory_item",
        entityId: item.id,
        before,
        after: item,
      },
      tx,
    );
    return item;
  });
}

export async function reorderPaixaoClutch(
  input: ReorderPaixaoClutchInput,
  actorUserId: string,
): Promise<void> {
  const { itemIds } = reorderPaixaoClutchSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);
  await db.transaction(async (tx) => {
    await lockCuration(tx);
    const published = await tx.select().from(inventoryItems)
      .where(and(eq(inventoryItems.type, "clutch"), eq(inventoryItems.paixaoClutchPublished, true)))
      .orderBy(asc(inventoryItems.id)).for("update");
    const members = new Map(published.map((item) => [item.id, item]));
    if (itemIds.length !== published.length || itemIds.some((id) => !members.has(id))) {
      throw new Error("A coleção publicada mudou. Atualize a página e tente novamente.");
    }
    for (const [sortOrder, itemId] of itemIds.entries()) {
      const before = members.get(itemId)!;
      const updatedAt = new Date();
      await tx.update(inventoryItems).set({ paixaoClutchSortOrder: sortOrder, updatedAt })
        .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.paixaoClutchPublished, true)));
      await recordAuditEvent({
        actorUserId,
        action: "inventory_item.paixao_clutch_reordered",
        entityType: "inventory_item",
        entityId: itemId,
        before,
        after: { ...before, paixaoClutchSortOrder: sortOrder, updatedAt },
      }, tx);
    }
  });
}

function curationPredicate(filters: PaixaoClutchAdminFilters): SQL {
  const conditions: SQL[] = [eq(inventoryItems.type, "clutch")];
  if (filters.active !== undefined) conditions.push(eq(inventoryItems.active, filters.active));
  if (filters.published !== undefined) {
    conditions.push(eq(inventoryItems.paixaoClutchPublished, filters.published));
  }
  if (filters.featured !== undefined) {
    conditions.push(eq(inventoryItems.paixaoClutchFeatured, filters.featured));
  }
  return and(...conditions) as SQL;
}

export async function listPaixaoClutchForAdmin(
  filters: PaixaoClutchAdminFilters,
  actorUserId: string,
): Promise<Array<InventoryItem & { futureReservations: FutureInventoryReservation[] }>> {
  await requireInventoryCatalogActor(actorUserId);
  const items = await db
    .select()
    .from(inventoryItems)
    .where(curationPredicate(filters))
    .orderBy(
      asc(inventoryItems.paixaoClutchSortOrder),
      asc(inventoryItems.code),
      asc(inventoryItems.id),
    );
  return withFutureInventoryReservations(items);
}
