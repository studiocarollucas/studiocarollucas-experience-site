import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
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

export type GalleryAssetLifecycleContext = {
  galleryId: string;
  assetId: string;
  storagePath: string;
};

export class GalleryAssetLifecycleError extends Error {
  constructor(message: string, public readonly context: GalleryAssetLifecycleContext, cause: unknown) {
    super(message, { cause });
    this.name = "GalleryAssetLifecycleError";
  }
}

async function getGalleryStorage(): Promise<GalleryStorage> {
  const supabase = await createSupabaseServerClient();
  return supabase.storage.from("gallery-assets") as GalleryStorage;
}

async function releaseUploadReservation(
  storage: GalleryStorage,
  context: GalleryAssetLifecycleContext,
  file: File,
  contentType: "image/jpeg" | "image/png" | "image/webp",
) {
  const cleanupFailures: unknown[] = [];
  try {
    const removed = await storage.remove([context.storagePath]);
    if (removed.error) throw removed.error;
  } catch (error) {
    cleanupFailures.push(error);
    return cleanupFailures;
  }

  try {
    await db
      .delete(galleryAssets)
      .where(and(eq(galleryAssets.id, context.assetId), eq(galleryAssets.galleryId, context.galleryId)));
  } catch (error) {
    cleanupFailures.push(error);
    try {
      const restored = await storage.upload(context.storagePath, file, { contentType, upsert: false });
      if (restored.error || !restored.data) {
        throw restored.error ?? new Error("gallery object restoration returned no data");
      }
    } catch (restoreError) {
      cleanupFailures.push(restoreError);
    }
  }

  return cleanupFailures;
}

export async function uploadGalleryAsset(input: unknown) {
  const { galleryId, file } = uploadGalleryAssetSchema.parse(input);
  const assetId = crypto.randomUUID();
  const extension = galleryAssetExtensions[file.type];
  const storagePath = galleryAssetPath(galleryId, assetId, extension);
  const context = { galleryId, assetId, storagePath };

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

  let storage: GalleryStorage | undefined;
  try {
    storage = await getGalleryStorage();
    const uploaded = await storage.upload(storagePath, file as File, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error || !uploaded.data) {
      throw uploaded.error ?? new Error("gallery storage upload returned no data");
    }
  } catch (error) {
    const cleanupFailures = storage
      ? await releaseUploadReservation(storage, context, file as File, file.type)
      : await (async () => {
          try {
            await db
              .delete(galleryAssets)
              .where(and(eq(galleryAssets.id, assetId), eq(galleryAssets.galleryId, galleryId)));
            return [] as unknown[];
          } catch (cleanupError) {
            return [cleanupError];
          }
        })();
    if (cleanupFailures.length > 0) {
      throw new GalleryAssetLifecycleError(
        "Não foi possível enviar a foto da galeria.",
        context,
        new AggregateError([error, ...cleanupFailures], "gallery upload cleanup failed"),
      );
    }
    throw new GalleryAssetLifecycleError("Não foi possível enviar a foto da galeria.", context, error);
  }

  return asset;
}

export async function reorderGalleryAssets(input: unknown): Promise<string[]> {
  const { galleryId, assetIds } = reorderGalleryAssetsSchema.parse(input);
  return db.transaction(async (transaction) => {
    const existingAssets = await transaction
      .select({ id: galleryAssets.id })
      .from(galleryAssets)
      .where(and(eq(galleryAssets.galleryId, galleryId), inArray(galleryAssets.id, assetIds)));
    if (existingAssets.length !== assetIds.length) {
      throw new Error("A foto não pertence a esta galeria.");
    }

    for (const [sortOrder, assetId] of assetIds.entries()) {
      await transaction
        .update(galleryAssets)
        .set({ sortOrder })
        .where(and(eq(galleryAssets.id, assetId), eq(galleryAssets.galleryId, galleryId)));
    }

    return assetIds;
  });
}

export async function removeGalleryAsset(input: unknown): Promise<void> {
  const { galleryId, assetId } = removeGalleryAssetSchema.parse(input);
  const [asset] = await db
    .delete(galleryAssets)
    .where(and(eq(galleryAssets.id, assetId), eq(galleryAssets.galleryId, galleryId)))
    .returning();
  if (!asset) throw new Error("Foto da galeria não encontrada.");

  try {
    const storage = await getGalleryStorage();
    const removed = await storage.remove([asset.storagePath]);
    if (removed.error) throw removed.error;
  } catch (error) {
    try {
      await db.insert(galleryAssets).values(asset);
    } catch (restoreError) {
      throw new Error("Não foi possível remover a foto da galeria.", {
        cause: new AggregateError([error, restoreError], "gallery asset restoration failed"),
      });
    }
    throw new Error("Não foi possível remover a foto da galeria.", { cause: error });
  }
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
