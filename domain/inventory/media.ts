import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryMedia } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/domain/audit/service";
import { requireInventoryCatalogActor } from "./authorization";
import {
  readInventoryMediaUrlsSchema,
  removeInventoryMediaSchema,
  reorderInventoryMediaSchema,
  setInventoryMediaCoverSchema,
  uploadInventoryMediaSchema,
} from "./media-schema";
import { inventoryMediaPath } from "./media-storage";

const INVENTORY_MEDIA_BUCKET = "inventory-media";
const SIGNED_URL_TTL_SECONDS = 60 * 10;
type MediaTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockItemMedia(tx: MediaTransaction, inventoryItemId: string) {
  // Serialize cover and ordering writes, including simultaneous first uploads.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`inventory-media:${inventoryItemId}`}, 0))`
  );
}

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
    options: { contentType: InventoryMediaContentType; upsert: false }
  ): Promise<{ data: { path: string } | null; error: unknown | null }>;
  remove(paths: string[]): Promise<{ data: unknown[] | null; error: unknown | null }>;
  createSignedUrls(
    paths: string[],
    expiresIn: number
  ): Promise<{
    data: Array<{ path: string; signedUrl: string | null; error: unknown | null }> | null;
    error: unknown | null;
  }>;
};

type InventoryMediaLifecycleContext = {
  inventoryItemId: string;
  mediaId: string;
  storagePath: string;
};

export class InventoryMediaLifecycleError extends Error {
  constructor(
    message: string,
    public readonly context: InventoryMediaLifecycleContext,
    cause: unknown
  ) {
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
  actorUserId: string
) {
  const cleanupFailures: unknown[] = [];
  try {
    const removed = await storage.remove([context.storagePath]);
    if (removed.error) throw removed.error;
  } catch (error) {
    return [error];
  }

  try {
    await deleteUploadReservation(context, actorUserId);
  } catch (error) {
    cleanupFailures.push(error);
    try {
      const restored = await storage.upload(context.storagePath, file, {
        contentType,
        upsert: false,
      });
      if (restored.error || !restored.data) {
        throw restored.error ?? new Error("inventory media object restoration returned no data");
      }
    } catch (restoreError) {
      cleanupFailures.push(restoreError);
    }
  }
  return cleanupFailures;
}

async function deleteUploadReservation(
  context: InventoryMediaLifecycleContext,
  actorUserId: string
) {
  await db.transaction(async (tx) => {
    await lockItemMedia(tx, context.inventoryItemId);
    await tx
      .delete(inventoryMedia)
      .where(
        and(
          eq(inventoryMedia.id, context.mediaId),
          eq(inventoryMedia.inventoryItemId, context.inventoryItemId)
        )
      );
    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_media.upload_failed",
        entityType: "inventory_media",
        entityId: context.mediaId,
        before: context,
        after: null,
      },
      tx
    );
  });
}

export async function uploadInventoryMedia(input: unknown, actorUserId: string) {
  const { inventoryItemId, file: metadata } = uploadInventoryMediaSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);
  // Object schemas intentionally validate metadata; storage needs the original bytes.
  const file = (input as { file: File }).file;
  if (!(file instanceof File)) throw new Error("Selecione um arquivo de imagem.");
  const mediaId = crypto.randomUUID();
  const extension = inventoryMediaExtensions[metadata.type];
  const storagePath = inventoryMediaPath(inventoryItemId, mediaId, extension);
  const context = { inventoryItemId, mediaId, storagePath };

  let media: typeof inventoryMedia.$inferSelect;
  try {
    media = await db.transaction(async (tx) => {
      await lockItemMedia(tx, inventoryItemId);
      const [existing] = await tx
        .select({
          sortOrder: sql<number>`coalesce(max(${inventoryMedia.sortOrder}), -1)`,
          hasCover: sql<boolean>`coalesce(bool_or(${inventoryMedia.isCover}), false)`,
        })
        .from(inventoryMedia)
        .where(eq(inventoryMedia.inventoryItemId, inventoryItemId))
        .limit(1);
      const [created] = await tx
        .insert(inventoryMedia)
        .values({
          id: mediaId,
          inventoryItemId,
          storagePath,
          sortOrder: (existing?.sortOrder ?? -1) + 1,
          isCover: !existing?.hasCover,
        })
        .returning();
      if (!created) throw new Error("inventory media reservation returned no data");
      await recordAuditEvent(
        {
          actorUserId,
          action: "inventory_media.upload_reserved",
          entityType: "inventory_media",
          entityId: created.id,
          before: null,
          after: created,
        },
        tx
      );
      return created;
    });
  } catch (error) {
    throw new Error("Não foi possível salvar a mídia do inventário.", { cause: error });
  }

  let storage: InventoryMediaStorage | undefined;
  try {
    storage = await getInventoryMediaStorage();
    const uploaded = await storage.upload(storagePath, file, {
      contentType: metadata.type,
      upsert: false,
    });
    if (uploaded.error || !uploaded.data) {
      throw uploaded.error ?? new Error("inventory media storage upload returned no data");
    }
    await db.transaction(async (tx) => {
      await recordAuditEvent(
        {
          actorUserId,
          action: "inventory_media.uploaded",
          entityType: "inventory_media",
          entityId: media.id,
          before: null,
          after: media,
        },
        tx
      );
    });
  } catch (error) {
    const cleanupFailures = storage
      ? await releaseUploadReservation(storage, context, file, metadata.type, actorUserId)
      : await (async () => {
          try {
            await deleteUploadReservation(context, actorUserId);
            return [] as unknown[];
          } catch (cleanupError) {
            return [cleanupError];
          }
        })();
    const cause =
      cleanupFailures.length > 0
        ? new AggregateError([error, ...cleanupFailures], "inventory media upload cleanup failed")
        : error;
    throw new InventoryMediaLifecycleError(
      "Não foi possível enviar a mídia do inventário.",
      context,
      cause
    );
  }

  return media;
}

export async function setInventoryMediaCover(input: unknown, actorUserId: string): Promise<void> {
  const { inventoryItemId, mediaId } = setInventoryMediaCoverSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);
  await db.transaction(async (transaction) => {
    await lockItemMedia(transaction, inventoryItemId);
    const [target] = await transaction
      .select({ id: inventoryMedia.id })
      .from(inventoryMedia)
      .where(
        and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId), isNull(inventoryMedia.deletionRequestedAt))
      )
      .limit(1);
    if (!target) throw new Error("Mídia do inventário não encontrada.");

    await transaction
      .update(inventoryMedia)
      .set({ isCover: false })
      .where(
        and(eq(inventoryMedia.inventoryItemId, inventoryItemId), eq(inventoryMedia.isCover, true))
      );
    await transaction
      .update(inventoryMedia)
      .set({ isCover: true })
      .where(
        and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId))
      );
    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_media.cover_changed",
        entityType: "inventory_media",
        entityId: mediaId,
        after: { inventoryItemId, mediaId },
      },
      transaction
    );
  });
}

export async function removeInventoryMedia(input: unknown, actorUserId: string): Promise<void> {
  const { inventoryItemId, mediaId } = removeInventoryMediaSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);
  // Persist the intent first. A process crash or storage/DB outage after this
  // commit leaves a hidden, retryable tombstone with the original object path.
  await db.transaction(async (tx) => {
    await lockItemMedia(tx, inventoryItemId);
    const [media] = await tx.select().from(inventoryMedia).where(
      and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId))
    ).limit(1);
    if (!media || media.deletionRequestedAt) return;
    const deletionRequestedAt = new Date();
    await tx.update(inventoryMedia).set({ deletionRequestedAt, isCover: false }).where(eq(inventoryMedia.id, mediaId));
    await recordAuditEvent({ actorUserId, action: "inventory_media.deletion_requested", entityType: "inventory_media",
      entityId: mediaId, before: media, after: { ...media, deletionRequestedAt, isCover: false } }, tx);
  });

  await db.transaction(async (tx) => {
    await lockItemMedia(tx, inventoryItemId);
    const [media] = await tx
      .select()
      .from(inventoryMedia)
      .where(
        and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId))
      )
      .limit(1);
    // Another retry may already have completed while this call waited for lock.
    if (!media) return;

    try {
      const storage = await getInventoryMediaStorage();
      const removed = await storage.remove([media.storagePath]);
      if (removed.error) throw removed.error;
    } catch (error) {
      throw new Error("Não foi possível remover a mídia do inventário.", { cause: error });
    }

    await tx
      .delete(inventoryMedia)
      .where(
        and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId))
      );
    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_media.removed",
        entityType: "inventory_media",
        entityId: mediaId,
        before: media,
        after: null,
      },
      tx
    );
  });
}

export async function reorderInventoryMedia(input: unknown, actorUserId: string): Promise<void> {
  const { inventoryItemId, mediaIds } = reorderInventoryMediaSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);
  await db.transaction(async (tx) => {
    await lockItemMedia(tx, inventoryItemId);
    const media = await tx
      .select({ id: inventoryMedia.id, sortOrder: inventoryMedia.sortOrder })
      .from(inventoryMedia)
      .where(and(eq(inventoryMedia.inventoryItemId, inventoryItemId), isNull(inventoryMedia.deletionRequestedAt)));
    const members = new Set(media.map((photo) => photo.id));
    if (mediaIds.length !== media.length || mediaIds.some((id) => !members.has(id)))
      throw new Error("A lista de fotos mudou. Atualize a página e tente novamente.");
    for (const [sortOrder, mediaId] of mediaIds.entries()) {
      await tx
        .update(inventoryMedia)
        .set({ sortOrder })
        .where(
          and(eq(inventoryMedia.id, mediaId), eq(inventoryMedia.inventoryItemId, inventoryItemId))
        );
    }
    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_media.reordered",
        entityType: "inventory_item",
        entityId: inventoryItemId,
        before: media,
        after: mediaIds,
      },
      tx
    );
  });
}

export async function readInventoryMediaUrls(inventoryItemId: string) {
  const id = readInventoryMediaUrlsSchema.parse(inventoryItemId);
  const media = await db
    .select()
    .from(inventoryMedia)
    .where(and(eq(inventoryMedia.inventoryItemId, id), isNull(inventoryMedia.deletionRequestedAt)))
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
