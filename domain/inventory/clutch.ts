import "server-only";

import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryItems, type InventoryItem } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { requireInventoryCatalogActor } from "./authorization";
import {
  type PaixaoClutchAdminFilters,
  type UpdatePaixaoClutchInput,
  updatePaixaoClutchSchema,
} from "./clutch-schema";

function assertPublishable(item: InventoryItem, input: ReturnType<typeof updatePaixaoClutchSchema.parse>): void {
  if (item.type !== "clutch") throw new Error("somente clutches podem participar da curadoria Paixão Clutch");
  if (!input.published) return;
  if (!item.active || item.status !== "available") {
    throw new Error("item indisponível não pode ser publicado na Paixão Clutch");
  }
  if (!input.rentalPrice || !input.copy || !input.publicImagePath) {
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
    const [before] = await tx
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, parsed.itemId))
      .limit(1)
      .for("update");
    if (!before) throw new Error("item de acervo inexistente");
    assertPublishable(before, parsed);

    const [item] = await tx
      .update(inventoryItems)
      .set({
        rentalPrice: parsed.rentalPrice,
        replacementValue: parsed.replacementValue,
        paixaoClutchCopy: parsed.copy,
        paixaoClutchPublicImagePath: parsed.publicImagePath,
        paixaoClutchPublished: parsed.published,
        paixaoClutchFeatured: parsed.featured,
        paixaoClutchSortOrder: parsed.sortOrder,
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
): Promise<InventoryItem[]> {
  await requireInventoryCatalogActor(actorUserId);
  return db
    .select()
    .from(inventoryItems)
    .where(curationPredicate(filters))
    .orderBy(
      asc(inventoryItems.paixaoClutchSortOrder),
      asc(inventoryItems.code),
      asc(inventoryItems.id),
    );
}
