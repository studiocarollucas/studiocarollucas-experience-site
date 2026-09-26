import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db/client";
import { galleries } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { galleryDownloadsInputSchema } from "./schema";
import { findAuthorizedClientAsset } from "./selections";
import { GALLERY_BUCKET, galleryDownloadFileName } from "./storage";

/** Download links are single-use in practice: the browser follows them right away. */
export const GALLERY_DOWNLOAD_URL_TTL_SECONDS = 60;

export type ClientAssetDownload =
  | { status: "ok"; signedUrl: string }
  | { status: "not_found" }
  | { status: "blocked" };

// The bucket is staff-only under RLS, so signing for a client needs the service
// role — created per call, server-side only, exactly like readClientGallery.
function galleryStorageAdmin() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return supabase.storage.from(GALLERY_BUCKET);
}

/**
 * Authorizes and signs a download for the portal client. `clientId` must come
 * from the server-side portal context. Only the short-lived signed URL leaves
 * the server; the storage path and keys never do.
 */
export async function createClientAssetDownload(clientId: string, assetId: string): Promise<ClientAssetDownload> {
  const asset = await findAuthorizedClientAsset(clientId, assetId);
  if (!asset) return { status: "not_found" };
  if (!asset.downloadsEnabled) return { status: "blocked" };

  const signed = await galleryStorageAdmin().createSignedUrl(asset.storagePath, GALLERY_DOWNLOAD_URL_TTL_SECONDS, {
    download: galleryDownloadFileName(asset.assetId, asset.storagePath),
  });
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error("gallery download URL unavailable", { cause: signed.error });
  }

  return { status: "ok", signedUrl: signed.data.signedUrl };
}

type SetGalleryDownloadsInput = {
  galleryId: string;
  enabled: boolean;
  /** Staff member responsible (from defineAdminAction's context). */
  actorUserId: string | null;
};

/**
 * Allows or blocks client downloads for one Gallery. The conditional UPDATE makes
 * concurrent or repeated requests safe: only the request that actually flips the
 * value writes the audit entry, in the same transaction.
 */
export async function setGalleryDownloadsEnabled(
  input: SetGalleryDownloadsInput,
): Promise<{ galleryId: string; downloadsEnabled: boolean; changed: boolean }> {
  const { galleryId, enabled } = galleryDownloadsInputSchema.parse({
    galleryId: input.galleryId,
    enabled: input.enabled,
  });

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(galleries)
      .set({ downloadsEnabled: enabled })
      .where(and(eq(galleries.id, galleryId), ne(galleries.downloadsEnabled, enabled)))
      .returning({ id: galleries.id });

    if (!updated) {
      const [existing] = await tx
        .select({ id: galleries.id })
        .from(galleries)
        .where(eq(galleries.id, galleryId))
        .limit(1);
      if (!existing) throw new Error("Galeria não encontrada.");
      return { galleryId, downloadsEnabled: enabled, changed: false };
    }

    await recordAuditEvent(
      {
        actorUserId: input.actorUserId,
        action: "gallery.downloads_updated",
        entityType: "gallery",
        entityId: galleryId,
        before: { downloadsEnabled: !enabled },
        after: { downloadsEnabled: enabled },
      },
      tx,
    );
    return { galleryId, downloadsEnabled: enabled, changed: true };
  });
}
