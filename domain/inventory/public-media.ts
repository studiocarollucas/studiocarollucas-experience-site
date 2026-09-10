import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  inventoryItems,
  inventoryMedia,
  inventoryPublicMedia,
  type InventoryPublicMedia,
} from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { requireInventoryCatalogActor } from "./authorization";
import { lockCuration } from "./curation-lock";
import {
  promoteInventoryMediaSchema,
  removeInventoryPublicMediaSchema,
  uploadInventoryPublicMediaSchema,
} from "./clutch-schema";
import {
  publicInventoryMediaPaths,
  publicInventoryMediaStorage,
  validatePublicInventoryMediaFile,
} from "./public-media-storage";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockClutch(tx: Transaction, itemId: string) {
  await lockCuration(tx);
  const [item] = await tx
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.id, itemId))
    .limit(1)
    .for("update");
  if (!item) throw new Error("Item de acervo inexistente.");
  if (item.type !== "clutch") throw new Error("Somente clutches podem ter imagem pública.");
  return item;
}

export class PublicInventoryMediaError extends Error {
  constructor(
    message: string,
    public readonly itemId: string,
    public readonly mediaId: string | null,
    cause: unknown
  ) {
    super(message, { cause });
    this.name = "PublicInventoryMediaError";
  }
}

// All object deletion is driven by committed metadata. A failed storage call,
// audit, DB commit, or process crash keeps a path that staff can retry removing.
async function cleanupMedia(itemId: string, actorUserId: string, pendingId?: string) {
  await db.transaction(async (tx) => {
    await lockClutch(tx, itemId);
    const targets = await tx
      .select()
      .from(inventoryPublicMedia)
      .where(
        and(
          eq(inventoryPublicMedia.inventoryItemId, itemId),
          pendingId
            ? eq(inventoryPublicMedia.id, pendingId)
            : eq(inventoryPublicMedia.state, "deleting")
        )
      )
      .for("update");
    const storage = await publicInventoryMediaStorage();
    for (const media of targets) {
      // An uncertain commit may have succeeded: never compensate a ready image.
      if (media.state === "ready") continue;
      await storage.remove(media.storagePath);
      await tx.delete(inventoryPublicMedia).where(eq(inventoryPublicMedia.id, media.id));
      await recordAuditEvent(
        {
          actorUserId,
          action: "inventory_public_media.removed",
          entityType: "inventory_public_media",
          entityId: media.id,
          before: media,
          after: null,
        },
        tx
      );
    }
  });
}

async function createPublicMedia(
  itemId: string,
  actorUserId: string,
  source: File | { mediaId: string }
): Promise<InventoryPublicMedia> {
  let file: File;
  const id = crypto.randomUUID();
  const reserved = await db.transaction(async (tx) => {
    await lockClutch(tx, itemId);
    if (source instanceof File) file = source;
    else {
      // Share the private-media lock with its removal lifecycle while copying bytes.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`inventory-media:${itemId}`}, 0))`
      );
      const [media] = await tx
        .select()
        .from(inventoryMedia)
        .where(
          and(eq(inventoryMedia.id, source.mediaId), eq(inventoryMedia.inventoryItemId, itemId))
        )
        .limit(1);
      if (!media || media.deletionRequestedAt)
        throw new Error("Mídia não pertence ao item ou está em remoção.");
      file = await (await publicInventoryMediaStorage()).downloadPrivate(media.storagePath);
    }
    await validatePublicInventoryMediaFile(file);
    const paths = publicInventoryMediaPaths(itemId, id, file);
    const [created] = await tx
      .insert(inventoryPublicMedia)
      .values({
        id,
        inventoryItemId: itemId,
        sourceMediaId: source instanceof File ? null : source.mediaId,
        ...paths,
        contentType: file.type,
        sizeBytes: file.size,
        state: "pending",
        createdByUserId: actorUserId,
      })
      .returning();
    if (!created) throw new Error("Não foi possível reservar a imagem pública.");
    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_public_media.upload_reserved",
        entityType: "inventory_public_media",
        entityId: id,
        before: null,
        after: created,
      },
      tx
    );
    return created;
  });

  let ready: InventoryPublicMedia;
  try {
    ready = await db.transaction(async (tx) => {
      const before = await lockClutch(tx, itemId);
      const [pending] = await tx
        .select()
        .from(inventoryPublicMedia)
        .where(and(eq(inventoryPublicMedia.id, id), eq(inventoryPublicMedia.state, "pending")))
        .limit(1)
        .for("update");
      if (!pending) throw new Error("O envio foi cancelado. Tente novamente.");
      await (await publicInventoryMediaStorage()).upload(reserved.storagePath, file!);
      await tx
        .update(inventoryPublicMedia)
        .set({ state: "deleting" })
        .where(
          and(
            eq(inventoryPublicMedia.inventoryItemId, itemId),
            eq(inventoryPublicMedia.state, "ready")
          )
        );
      const [result] = await tx
        .update(inventoryPublicMedia)
        .set({ state: "ready" })
        .where(eq(inventoryPublicMedia.id, id))
        .returning();
      if (!result) throw new Error("Não foi possível confirmar a imagem pública.");
      await tx
        .update(inventoryItems)
        .set({ paixaoClutchPublicImagePath: result.publicPath, updatedAt: new Date() })
        .where(eq(inventoryItems.id, itemId));
      await recordAuditEvent(
        {
          actorUserId,
          action:
            source instanceof File
              ? "inventory_public_media.uploaded"
              : "inventory_public_media.promoted",
          entityType: "inventory_public_media",
          entityId: id,
          before: { publicPath: before.paixaoClutchPublicImagePath },
          after: result,
        },
        tx
      );
      return result;
    });
  } catch (error) {
    try {
      await cleanupMedia(itemId, actorUserId, id);
    } catch (cleanupError) {
      throw new PublicInventoryMediaError(
        "Falha no envio e na limpeza da imagem pública. Tente remover novamente.",
        itemId,
        id,
        new AggregateError([error, cleanupError])
      );
    }
    throw new PublicInventoryMediaError(
      "Não foi possível confirmar a imagem pública.",
      itemId,
      id,
      error
    );
  }
  try {
    await cleanupMedia(itemId, actorUserId);
  } catch (error) {
    throw new PublicInventoryMediaError(
      "A nova imagem foi salva, mas a anterior ainda precisa ser removida. Tente novamente.",
      itemId,
      id,
      error
    );
  }
  return ready;
}

export async function uploadInventoryPublicMedia(input: unknown, actorUserId: string) {
  const { itemId } = uploadInventoryPublicMediaSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);
  const file = (input as { file: File }).file;
  if (!(file instanceof File)) throw new Error("Selecione um arquivo de imagem.");
  return createPublicMedia(itemId, actorUserId, file);
}

export async function promoteInventoryMedia(input: unknown, actorUserId: string) {
  const { itemId, mediaId } = promoteInventoryMediaSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);
  return createPublicMedia(itemId, actorUserId, { mediaId });
}

export async function removeInventoryPublicMedia(
  input: unknown,
  actorUserId: string
): Promise<void> {
  const { itemId } = removeInventoryPublicMediaSchema.parse(input);
  await requireInventoryCatalogActor(actorUserId);
  await db.transaction(async (tx) => {
    const before = await lockClutch(tx, itemId);
    await tx
      .update(inventoryItems)
      .set({
        paixaoClutchPublicImagePath: null,
        paixaoClutchPublished: false,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, itemId));
    await tx
      .update(inventoryPublicMedia)
      .set({ state: "deleting" })
      .where(eq(inventoryPublicMedia.inventoryItemId, itemId));
    await recordAuditEvent(
      {
        actorUserId,
        action: "inventory_public_media.deletion_requested",
        entityType: "inventory_item",
        entityId: itemId,
        before,
        after: { paixaoClutchPublicImagePath: null, paixaoClutchPublished: false },
      },
      tx
    );
  });
  try {
    await cleanupMedia(itemId, actorUserId);
  } catch (error) {
    throw new PublicInventoryMediaError(
      "Item despublicado. Não foi possível remover o arquivo público; tente novamente.",
      itemId,
      null,
      error
    );
  }
}

export async function readInventoryPublicMedia(itemId: string, actorUserId: string) {
  removeInventoryPublicMediaSchema.parse({ itemId });
  await requireInventoryCatalogActor(actorUserId);
  const [media] = await db
    .select()
    .from(inventoryPublicMedia)
    .where(
      and(eq(inventoryPublicMedia.inventoryItemId, itemId), eq(inventoryPublicMedia.state, "ready"))
    )
    .limit(1);
  return media ? { id: media.id, publicPath: media.publicPath } : null;
}
