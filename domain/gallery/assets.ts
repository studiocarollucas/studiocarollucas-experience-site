import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { galleries, galleryAssets } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  publishGallerySchema,
  removeGalleryAssetSchema,
  reorderGalleryAssetsSchema,
  uploadGalleryAssetSchema,
} from "./schema";
import { galleryAssetPath } from "./storage";

const galleryAssetExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type GalleryStorage = {
  upload(
    path: string,
    file: File,
    options: { contentType: "image/jpeg" | "image/png" | "image/webp"; upsert: false },
  ): Promise<{ data: { path: string } | null; error: unknown | null }>;
  remove(paths: string[]): Promise<{ data: unknown[] | null; error: unknown | null }>;
};

async function getGalleryStorage(): Promise<GalleryStorage> {
  const supabase = await createSupabaseServerClient();
  return supabase.storage.from("gallery-assets") as GalleryStorage;
}

async function releaseUploadReservation(galleryId: string, assetId: string, storagePath: string) {
  const cleanupFailures: unknown[] = [];
  try {
    const storage = await getGalleryStorage();
    const removed = await storage.remove([storagePath]);
    if (removed.error) cleanupFailures.push(removed.error);
  } catch (error) {
    cleanupFailures.push(error);
  }

  try {
    await db.delete(galleryAssets).where(and(eq(galleryAssets.id, assetId), eq(galleryAssets.galleryId, galleryId)));
  } catch (error) {
    cleanupFailures.push(error);
  }

  return cleanupFailures;
}

export async function uploadGalleryAsset(input: unknown) {
  const { galleryId, file } = uploadGalleryAssetSchema.parse(input);
  const assetId = crypto.randomUUID();
  const extension = galleryAssetExtensions[file.type];
  const storagePath = galleryAssetPath(galleryId, assetId, extension);

  let asset: typeof galleryAssets.$inferSelect;
  try {
    const [created] = await db
      .insert(galleryAssets)
      .values({ id: assetId, galleryId, storagePath, sortOrder: 0 })
      .returning();
    if (!created) throw new Error("gallery asset reservation returned no data");
    asset = created;
  } catch (error) {
    throw new Error("Não foi possível salvar a foto da galeria.", { cause: error });
  }

  try {
    const storage = await getGalleryStorage();
    const uploaded = await storage.upload(storagePath, file as File, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error || !uploaded.data) {
      throw uploaded.error ?? new Error("gallery storage upload returned no data");
    }
  } catch (error) {
    const cleanupFailures = await releaseUploadReservation(galleryId, assetId, storagePath);
    if (cleanupFailures.length > 0) {
      throw new Error("Não foi possível enviar a foto da galeria.", {
        cause: new AggregateError([error, ...cleanupFailures], "gallery upload cleanup failed"),
      });
    }
    throw new Error("Não foi possível enviar a foto da galeria.", { cause: error });
  }

  return asset;
}

export async function reorderGalleryAssets(input: unknown): Promise<string[]> {
  const { galleryId, assetIds } = reorderGalleryAssetsSchema.parse(input);
  const reorderedIds: string[] = [];

  for (const [sortOrder, assetId] of assetIds.entries()) {
    const [updated] = await db
      .update(galleryAssets)
      .set({ sortOrder })
      .where(and(eq(galleryAssets.id, assetId), eq(galleryAssets.galleryId, galleryId)))
      .returning({ id: galleryAssets.id });
    if (!updated) throw new Error("A foto não pertence a esta galeria.");
    reorderedIds.push(updated.id);
  }

  return reorderedIds;
}

export async function removeGalleryAsset(input: unknown): Promise<void> {
  const { galleryId, assetId } = removeGalleryAssetSchema.parse(input);
  const [asset] = await db
    .select({ id: galleryAssets.id, galleryId: galleryAssets.galleryId, storagePath: galleryAssets.storagePath })
    .from(galleryAssets)
    .where(and(eq(galleryAssets.id, assetId), eq(galleryAssets.galleryId, galleryId)));
  if (!asset) throw new Error("Foto da galeria não encontrada.");

  const storage = await getGalleryStorage();
  const removed = await storage.remove([asset.storagePath]);
  if (removed.error) throw new Error("Não foi possível remover a foto da galeria.", { cause: removed.error });

  await db.delete(galleryAssets).where(and(eq(galleryAssets.id, assetId), eq(galleryAssets.galleryId, galleryId)));
}

export async function publishGallery(galleryId: string) {
  const id = publishGallerySchema.parse(galleryId);
  const [gallery] = await db
    .update(galleries)
    .set({ status: "published" })
    .where(eq(galleries.id, id))
    .returning();
  if (!gallery) throw new Error("Galeria não encontrada.");

  const assets = await db
    .select({ id: galleryAssets.id })
    .from(galleryAssets)
    .where(eq(galleryAssets.galleryId, id))
    .orderBy(asc(galleryAssets.sortOrder), asc(galleryAssets.createdAt));

  return { ...gallery, assetIds: assets.map((asset) => asset.id) };
}
