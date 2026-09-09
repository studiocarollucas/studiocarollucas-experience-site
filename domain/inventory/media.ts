import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryMedia } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  readInventoryMediaUrlsSchema,
  removeInventoryMediaSchema,
  setInventoryMediaCoverSchema,
  uploadInventoryMediaSchema,
} from "./media-schema";
import { inventoryMediaPath } from "./media-storage";

const INVENTORY_MEDIA_BUCKET = "inventory-media";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

const inventoryMediaExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type InventoryMediaContentType = keyof typeof inventoryMediaExtensions;

type InventoryMediaStorage = {
  upload(
    path: string,
    file: File,
    options: { contentType: InventoryMediaContentType; upsert: false },
  ): Promise<{ data: { path: string } | null; error: unknown | null }>;
  remove(paths: string[]): Promise<{ data: unknown[] | null; error: unknown | null }>;
  createSignedUrls(
    paths: string[],
    expiresIn: number,
  ): Promise<{ data: Array<{ path: string; signedUrl: string | null; error: unknown | null }> | null; error: unknown | null }>;
};

type InventoryMediaLifecycleContext = {
  inventoryItemId: string;
  mediaId: string;
  storagePath: string;
};

export class InventoryMediaLifecycleError extends Error {
  constructor(message: string, public readonly context: InventoryMediaLifecycleContext, cause: unknown) {
    super(message, { cause });
    this.name = "InventoryMediaLifecycleError";
  }
}

async function getInventoryMediaStorage(): Promise<InventoryMediaStorage> {
  const supabase = await createSupabaseServerClient();
  return supabase.storage.from(INVENTORY_MEDIA_BUCKET) as InventoryMediaStorage;
}

async function releaseUploadReservation(
  storage: InventoryMediaStorage,
  context: InventoryMediaLifecycleContext,
  file: File,
  contentType: InventoryMediaContentType,
) {
  const cleanupFailures: unknown[] = [];
  try {
    const removed = await storage.remove([context.storagePath]);
    if (removed.error) throw removed.error;
  } catch (error) {
    return [error];
  }

  try {
    await db
      .delete(inventoryMedia)
      .where(and(eq(inventoryMedia.id, context.mediaId), eq(inventoryMedia.inventoryItemId, context.inventoryItemId)));
  } catch (error) {
    cleanupFailures.push(error);
    try {
      const restored = await storage.upload(context.storagePath, file, { contentType, upsert: false });
      if (restored.error || !restored.data) {
        throw restored.error ?? new Error("inventory media object restoration returned no data");
      }
    } catch (restoreError) {
      cleanupFailures.push(restoreError);
    }
  }
  return cleanupFailures;
}

export async function uploadInventoryMedia(input: unknown) {
  const { inventoryItemId, file } = uploadInventoryMediaSchema.parse(input);
  const mediaId = crypto.randomUUID();
  const extension = inventoryMediaExtensions[file.type];
  const storagePath = inventoryMediaPath(inventoryItemId, mediaId, extension);
  const context = { inventoryItemId, mediaId, storagePath };

  let media: typeof inventoryMedia.$inferSelect;
  try {
    const [existingCover] = await db
      .select({ id: inventoryMedia.id })
      .from(inventoryMedia)
      .where(and(eq(inventoryMedia.inventoryItemId, inventoryItemId), eq(inventoryMedia.isCover, true)))
      .limit(1);
    const [created] = await db
      .insert(inventoryMedia)
      .values({ id: mediaId, inventoryItemId, storagePath, sortOrder: 0, isCover: !existingCover })
      .returning();
    if (!created) throw new Error("inventory media reservation returned no data");
    media = created;
  } catch (error) {
    throw new Error("Não foi possível salvar a mídia do inventário.", { cause: error });
  }

  let storage: InventoryMediaStorage | undefined;
  try {
    storage = await getInventoryMediaStorage();
    const uploaded = await storage.upload(storagePath, file as File, { contentType: file.type, upsert: false });
    if (uploaded.error || !uploaded.data) {
      throw uploaded.error ?? new Error("inventory media storage upload returned no data");
    }
  } catch (error) {
    const cleanupFailures = storage
      ? await releaseUploadReservation(storage, context, file as File, file.type)
      : await (async () => {
          try {
            await db
              .delete(inventoryMedia)
              .where(and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId)));
            return [] as unknown[];
          } catch (cleanupError) {
            return [cleanupError];
          }
        })();
    const cause = cleanupFailures.length > 0
      ? new AggregateError([error, ...cleanupFailures], "inventory media upload cleanup failed")
      : error;
    throw new InventoryMediaLifecycleError("Não foi possível enviar a mídia do inventário.", context, cause);
  }

  return media;
}

export async function setInventoryMediaCover(input: unknown): Promise<void> {
  const { inventoryItemId, mediaId } = setInventoryMediaCoverSchema.parse(input);
  await db.transaction(async (transaction) => {
    const [target] = await transaction
      .select({ id: inventoryMedia.id })
      .from(inventoryMedia)
      .where(and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId)))
      .limit(1);
    if (!target) throw new Error("Mídia do inventário não encontrada.");

    await transaction
      .update(inventoryMedia)
      .set({ isCover: false })
      .where(and(eq(inventoryMedia.inventoryItemId, inventoryItemId), eq(inventoryMedia.isCover, true)));
    await transaction
      .update(inventoryMedia)
      .set({ isCover: true })
      .where(and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId)));
  });
}

export async function removeInventoryMedia(input: unknown): Promise<void> {
  const { inventoryItemId, mediaId } = removeInventoryMediaSchema.parse(input);
  const [media] = await db
    .select()
    .from(inventoryMedia)
    .where(and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId)))
    .limit(1);
  if (!media) throw new Error("Mídia do inventário não encontrada.");

  try {
    const storage = await getInventoryMediaStorage();
    const removed = await storage.remove([media.storagePath]);
    if (removed.error) throw removed.error;
  } catch (error) {
    throw new Error("Não foi possível remover a mídia do inventário.", { cause: error });
  }

  await db
    .delete(inventoryMedia)
    .where(and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId)));
}

export async function readInventoryMediaUrls(inventoryItemId: string) {
  const id = readInventoryMediaUrlsSchema.parse(inventoryItemId);
  const media = await db
    .select()
    .from(inventoryMedia)
    .where(eq(inventoryMedia.inventoryItemId, id))
    .orderBy(asc(inventoryMedia.sortOrder), asc(inventoryMedia.createdAt));
  if (media.length === 0) return [];

  const storage = await getInventoryMediaStorage();
  const paths = media.map((item) => item.storagePath);
  const signed = await storage.createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data || signed.data.length !== paths.length) {
    throw new Error("inventory media URLs unavailable", { cause: signed.error });
  }

  const urlsByPath = new Map<string, string>();
  for (const item of signed.data) {
    if (item.error || !item.path || !item.signedUrl || urlsByPath.has(item.path)) {
      throw new Error("inventory media URLs unavailable", { cause: item.error });
    }
    urlsByPath.set(item.path, item.signedUrl);
  }

  return media.map((item) => {
    const signedUrl = urlsByPath.get(item.storagePath);
    if (!signedUrl) throw new Error("inventory media URLs unavailable");
    return {
      id: item.id,
      inventoryItemId: item.inventoryItemId,
      sortOrder: item.sortOrder,
      isCover: item.isCover,
      publishable: item.publishable,
      signedUrl,
    };
  });
}
