import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { galleries, galleryUpsellOffers, upsellProducts, type UpsellProduct } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { UpsellError, upsellErrorFromDatabase } from "./errors";
import {
  deleteUpsellProductSchema,
  galleryUpsellOffersSchema,
  updateUpsellProductSchema,
  upsellProductSchema,
  type GalleryUpsellOffersInput,
} from "./schema";

// SCL-506: the Admin-managed catalog and the per-Gallery offers. Every write is
// audited in the same transaction; `actorUserId` comes from defineAdminAction.

export async function listUpsellProducts(): Promise<UpsellProduct[]> {
  return db.select().from(upsellProducts).orderBy(asc(upsellProducts.sortOrder), asc(upsellProducts.name));
}

export async function getUpsellProductById(id: string): Promise<UpsellProduct | null> {
  const [row] = await db.select().from(upsellProducts).where(eq(upsellProducts.id, id)).limit(1);
  return row ?? null;
}

function productValues(parsed: ReturnType<typeof upsellProductSchema.parse>) {
  return {
    kind: parsed.kind,
    name: parsed.name,
    // The Admin form always sends the whole product: an omitted text clears it.
    description: parsed.description || null,
    internalNotes: parsed.internalNotes || null,
    price: parsed.price,
    active: parsed.active,
    sortOrder: parsed.sortOrder,
  };
}

export async function createUpsellProduct(input: unknown, actorUserId: string | null): Promise<UpsellProduct> {
  const parsed = upsellProductSchema.parse(input);

  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx.insert(upsellProducts).values(productValues(parsed)).returning();
      await recordAuditEvent(
        {
          actorUserId,
          action: "upsell_product.created",
          entityType: "upsell_product",
          entityId: created.id,
          before: null,
          after: created,
        },
        tx,
      );
      return created;
    });
  } catch (error) {
    throw upsellErrorFromDatabase(error) ?? error;
  }
}

export async function updateUpsellProduct(input: unknown, actorUserId: string | null): Promise<UpsellProduct> {
  const { id, ...fields } = updateUpsellProductSchema.parse(input);

  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(upsellProducts)
        .where(eq(upsellProducts.id, id))
        .limit(1)
        .for("update");
      if (!before) throw new UpsellError("Produto inexistente.");

      const [after] = await tx
        .update(upsellProducts)
        .set({ ...productValues(fields), updatedAt: new Date() })
        .where(eq(upsellProducts.id, id))
        .returning();
      await recordAuditEvent(
        {
          actorUserId,
          action: "upsell_product.updated",
          entityType: "upsell_product",
          entityId: id,
          before,
          after,
        },
        tx,
      );
      return after;
    });
  } catch (error) {
    throw upsellErrorFromDatabase(error) ?? error;
  }
}

/**
 * Removes a product from the catalog. Its Gallery offers go with it (cascade);
 * orders keep their item snapshot (product_id becomes null). To take a product
 * out of the portal without touching history, deactivate it instead.
 */
export async function deleteUpsellProduct(input: unknown, actorUserId: string | null): Promise<{ id: string }> {
  const { id } = deleteUpsellProductSchema.parse(input);

  return db.transaction(async (tx) => {
    const [deleted] = await tx.delete(upsellProducts).where(eq(upsellProducts.id, id)).returning();
    if (!deleted) throw new UpsellError("Produto inexistente.");
    await recordAuditEvent(
      {
        actorUserId,
        action: "upsell_product.deleted",
        entityType: "upsell_product",
        entityId: id,
        before: deleted,
        after: null,
      },
      tx,
    );
    return { id };
  });
}

export async function listGalleryUpsellOfferProductIds(galleryId: string): Promise<string[]> {
  const rows = await db
    .select({ productId: galleryUpsellOffers.productId })
    .from(galleryUpsellOffers)
    .where(eq(galleryUpsellOffers.galleryId, galleryId));
  return rows.map((row) => row.productId);
}

/**
 * Replaces the set of products a Gallery offers (and therefore its Shoot, since
 * a Gallery belongs to exactly one Shoot). The Gallery row is locked so two
 * concurrent edits serialize; only a real change is written and audited.
 */
export async function setGalleryUpsellOffers(
  input: GalleryUpsellOffersInput,
  actorUserId: string | null,
): Promise<{ galleryId: string; productIds: string[]; changed: boolean }> {
  const { galleryId, productIds } = galleryUpsellOffersSchema.parse(input);

  return db.transaction(async (tx) => {
    const [gallery] = await tx
      .select({ id: galleries.id })
      .from(galleries)
      .where(eq(galleries.id, galleryId))
      .limit(1)
      .for("update");
    if (!gallery) throw new UpsellError("Galeria não encontrada.");

    if (productIds.length > 0) {
      const existing = await tx
        .select({ id: upsellProducts.id })
        .from(upsellProducts)
        .where(inArray(upsellProducts.id, productIds));
      if (existing.length !== productIds.length) throw new UpsellError("Produto inexistente.");
    }

    const currentRows = await tx
      .select({ productId: galleryUpsellOffers.productId })
      .from(galleryUpsellOffers)
      .where(eq(galleryUpsellOffers.galleryId, galleryId));
    const current = currentRows.map((row) => row.productId);

    const next = new Set(productIds);
    const toRemove = current.filter((id) => !next.has(id));
    const toAdd = productIds.filter((id) => !current.includes(id));
    const sortedNext = [...next].sort();
    if (toRemove.length === 0 && toAdd.length === 0) {
      return { galleryId, productIds: sortedNext, changed: false };
    }

    if (toRemove.length > 0) {
      await tx
        .delete(galleryUpsellOffers)
        .where(and(eq(galleryUpsellOffers.galleryId, galleryId), inArray(galleryUpsellOffers.productId, toRemove)));
    }
    if (toAdd.length > 0) {
      await tx
        .insert(galleryUpsellOffers)
        .values(toAdd.map((productId) => ({ galleryId, productId })))
        .onConflictDoNothing();
    }

    await recordAuditEvent(
      {
        actorUserId,
        action: "gallery.upsell_offers_updated",
        entityType: "gallery",
        entityId: galleryId,
        before: { productIds: [...current].sort() },
        after: { productIds: sortedNext },
      },
      tx,
    );
    return { galleryId, productIds: sortedNext, changed: true };
  });
}
