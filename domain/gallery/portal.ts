import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db/client";
import { galleryAssets, galleries, shoots, type GalleryAsset } from "@/db/schema";
import type { PortalContext } from "@/domain/portal/read";

const GALLERY_BUCKET = "gallery-assets";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

async function findPublishedGalleryForClient(clientId: string) {
  const [gallery] = await db
    .select()
    .from(galleries)
    .innerJoin(shoots, eq(galleries.shootId, shoots.id))
    .where(and(eq(shoots.clientId, clientId), eq(galleries.status, "published")))
    .limit(1);

  if (!gallery) return null;

  const assets = await db
    .select()
    .from(galleryAssets)
    .where(eq(galleryAssets.galleryId, gallery.galleries.id))
    .orderBy(asc(galleryAssets.sortOrder), asc(galleryAssets.createdAt));

  return { ...gallery.galleries, assets };
}

async function signGalleryAssetUrls(assets: GalleryAsset[]) {
  if (assets.length === 0) return [];

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const paths = assets.map((asset) => asset.storagePath);
  const signed = await supabase.storage
    .from(GALLERY_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (signed.error || !signed.data || signed.data.length !== paths.length) {
    throw new Error("gallery asset URLs unavailable", { cause: signed.error });
  }

  const urlsByPath = new Map<string, string>();
  for (const item of signed.data) {
    if (item.error || !item.path || !item.signedUrl || urlsByPath.has(item.path)) {
      throw new Error("gallery asset URLs unavailable", { cause: item.error });
    }
    urlsByPath.set(item.path, item.signedUrl);
  }

  return assets.map((asset) => {
    const signedUrl = urlsByPath.get(asset.storagePath);
    if (!signedUrl) throw new Error("gallery asset URLs unavailable");
    return { ...asset, signedUrl };
  });
}

export async function readClientGallery(context: PortalContext) {
  const gallery = await findPublishedGalleryForClient(context.client.id);
  if (!gallery) return null;

  return { ...gallery, assets: await signGalleryAssetUrls(gallery.assets) };
}
