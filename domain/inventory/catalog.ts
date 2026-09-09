import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryItems, type InventoryItem } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { createInventoryItemSchema, updateInventoryItemSchema, type UpdateInventoryItemInput } from "./catalog-schema";
import type { CreateInventoryItemInput } from "./schema";
import { requireInventoryCatalogActor } from "./authorization";

type InventoryReader = Pick<typeof db, "select">;

async function findItem(reader: InventoryReader, id: string): Promise<InventoryItem | undefined> {
  const [item] = await reader.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
  return item;
}

async function assertCodeAvailable(reader: InventoryReader, code: string, idToExclude?: string): Promise<void> {
  const conditions = [eq(inventoryItems.code, code)];
  if (idToExclude) conditions.push(ne(inventoryItems.id, idToExclude));
  const [existing] = await reader
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(and(...conditions))
    .limit(1);
  if (existing) throw new Error("código já cadastrado");
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
  actorUserId: string,
): Promise<InventoryItem> {
  const parsed = createInventoryItemSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);
  await assertCodeAvailable(db, parsed.code);

  return db.transaction(async (tx) => {
    const [item] = await tx.insert(inventoryItems).values(parsed).returning();
    if (!item) throw new Error("falha ao criar item de acervo");
    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_item.created",
        entityType: "inventory_item",
        entityId: item.id,
        before: null,
        after: item,
      },
      tx,
    );
    return item;
  });
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput,
  actorUserId: string,
): Promise<InventoryItem> {
  const patch = updateInventoryItemSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);

  return db.transaction(async (tx) => {
    const before = await findItem(tx, id);
    if (!before) throw new Error("item de acervo inexistente");
    if (patch.code && patch.code !== before.code) await assertCodeAvailable(tx, patch.code, id);
    const [item] = await tx
      .update(inventoryItems)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    if (!item) throw new Error("item de acervo inexistente");
    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_item.updated",
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

export async function deactivateInventoryItem(id: string, actorUserId: string): Promise<InventoryItem> {
  await requireInventoryCatalogActor(actorUserId);

  return db.transaction(async (tx) => {
    const before = await findItem(tx, id);
    if (!before) throw new Error("item de acervo inexistente");
    const [item] = await tx
      .update(inventoryItems)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    if (!item) throw new Error("item de acervo inexistente");
    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_item.deactivated",
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
