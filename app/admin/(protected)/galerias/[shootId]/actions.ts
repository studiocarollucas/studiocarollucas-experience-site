"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { publishGallery, removeGalleryAsset, uploadGalleryAsset } from "@/domain/gallery/assets";

const publishGalleryInput = z.object({
  galleryId: z.string().uuid(),
  shootId: z.string().uuid(),
});

function asObject(raw: unknown) {
  return raw instanceof FormData ? Object.fromEntries(raw.entries()) : raw;
}

const uploadGalleryInput = z.preprocess(
  asObject,
  z.object({ galleryId: z.string().uuid(), shootId: z.string().uuid(), file: z.instanceof(File) }),
);

const removeGalleryAssetInput = z.preprocess(
  asObject,
  z.object({ galleryId: z.string().uuid(), shootId: z.string().uuid(), assetId: z.string().uuid() }),
);

export const publishGalleryAction = defineAdminAction(
  { role: "staff", input: publishGalleryInput },
  async ({ galleryId, shootId }) => {
    await publishGallery(galleryId);
    revalidatePath(`/admin/galerias/${shootId}`);
    return { id: galleryId };
  },
);

export const uploadGalleryAssetAction = defineAdminAction(
  { role: "staff", input: uploadGalleryInput },
  async ({ galleryId, shootId, file }) => {
    const asset = await uploadGalleryAsset({ galleryId, file });
    revalidatePath(`/admin/galerias/${shootId}`);
    return { id: asset.id };
  },
);

export const removeGalleryAssetAction = defineAdminAction(
  { role: "staff", input: removeGalleryAssetInput },
  async ({ galleryId, shootId, assetId }) => {
    await removeGalleryAsset({ galleryId, assetId });
    revalidatePath(`/admin/galerias/${shootId}`);
    return { id: assetId };
  },
);
