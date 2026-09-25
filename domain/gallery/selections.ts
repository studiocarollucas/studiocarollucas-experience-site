import "server-only";

import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { galleries, galleryAssets, photoSelections, shoots } from "@/db/schema";
import { photoSelectionInputSchema } from "./schema";

export type GallerySelectionErrorCode = "invalid_input" | "not_authorized";

export class GallerySelectionError extends Error {
  constructor(public readonly code: GallerySelectionErrorCode) {
    super(code === "invalid_input" ? "Seleção inválida." : "Esta foto não está disponível para seleção.");
    this.name = "GallerySelectionError";
  }
}

export type AuthorizedClientAsset = {
  assetId: string;
  galleryId: string;
  storagePath: string;
  downloadsEnabled: boolean;
};

export type GallerySelectionSummary = {
  totalSelections: number;
  byAssetId: Record<string, number>;
};

const assetIdSchema = z.string().uuid();

/**
 * The single authorization rule for client-facing asset operations (favorites
 * and downloads): the asset must belong to a published Gallery of a Shoot owned
 * by `clientId`. `clientId` must come from the server-side portal context. A
 * foreign, draft or missing asset all return null, so callers answer neutrally.
 */
export async function findAuthorizedClientAsset(
  clientId: string,
  assetId: string,
): Promise<AuthorizedClientAsset | null> {
  if (!assetIdSchema.safeParse(assetId).success) return null;

  const [asset] = await db
    .select({
      assetId: galleryAssets.id,
      galleryId: galleryAssets.galleryId,
      storagePath: galleryAssets.storagePath,
      downloadsEnabled: galleries.downloadsEnabled,
    })
    .from(galleryAssets)
    .innerJoin(galleries, eq(galleryAssets.galleryId, galleries.id))
    .innerJoin(shoots, eq(galleries.shootId, shoots.id))
    .where(
      and(
        eq(galleryAssets.id, assetId),
        eq(shoots.clientId, clientId),
        eq(galleries.status, "published"),
      ),
    )
    .limit(1);

  return asset ?? null;
}

/**
 * Sets (not toggles) the client's favorite for one asset. Idempotent and safe
 * under concurrency: selecting uses ON CONFLICT DO NOTHING on the unique
 * client/gallery/asset key; unselecting deletes by that key.
 */
export async function setPhotoSelection(
  clientId: string,
  input: unknown,
): Promise<{ assetId: string; selected: boolean }> {
  const parsed = photoSelectionInputSchema.safeParse(input);
  if (!parsed.success) throw new GallerySelectionError("invalid_input");
  const { assetId, selected } = parsed.data;

  const asset = await findAuthorizedClientAsset(clientId, assetId);
  if (!asset) throw new GallerySelectionError("not_authorized");

  if (selected) {
    await db
      .insert(photoSelections)
      .values({ clientId, galleryId: asset.galleryId, assetId: asset.assetId })
      .onConflictDoNothing({
        target: [photoSelections.clientId, photoSelections.galleryId, photoSelections.assetId],
      });
  } else {
    await db
      .delete(photoSelections)
      .where(
        and(
          eq(photoSelections.clientId, clientId),
          eq(photoSelections.galleryId, asset.galleryId),
          eq(photoSelections.assetId, asset.assetId),
        ),
      );
  }

  return { assetId: asset.assetId, selected };
}

export async function listClientSelectedAssetIds(clientId: string, galleryId: string): Promise<string[]> {
  const rows = await db
    .select({ assetId: photoSelections.assetId })
    .from(photoSelections)
    .where(and(eq(photoSelections.clientId, clientId), eq(photoSelections.galleryId, galleryId)));

  return rows.map((row) => row.assetId);
}

/** Favorite counts per Gallery and per asset — read by the Admin and by upsell (SCL-506). */
export async function getGallerySelectionSummary(galleryId: string): Promise<GallerySelectionSummary> {
  const rows = await db
    .select({ assetId: photoSelections.assetId, total: count() })
    .from(photoSelections)
    .where(eq(photoSelections.galleryId, galleryId))
    .groupBy(photoSelections.assetId);

  const byAssetId: Record<string, number> = {};
  let totalSelections = 0;
  for (const row of rows) {
    byAssetId[row.assetId] = row.total;
    totalSelections += row.total;
  }

  return { totalSelections, byAssetId };
}
