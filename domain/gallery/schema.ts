import { z } from "zod";

export const galleryImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const maxGalleryAssetBytes = 20 * 1024 * 1024;

export const galleryAssetFileSchema = z.object({
  type: z.enum(galleryImageMimeTypes),
  size: z.number().positive().max(maxGalleryAssetBytes),
});

const galleryIdSchema = z.string().uuid();

export const uploadGalleryAssetSchema = z.object({
  galleryId: galleryIdSchema,
  file: galleryAssetFileSchema,
});

export const reorderGalleryAssetsSchema = z.object({
  galleryId: galleryIdSchema,
  assetIds: z.array(z.string().uuid()).superRefine((assetIds, context) => {
    if (new Set(assetIds).size !== assetIds.length) {
      context.addIssue({ code: "custom", message: "Os ativos da galeria devem ser únicos." });
    }
  }),
});

export const removeGalleryAssetSchema = z.object({
  galleryId: galleryIdSchema,
  assetId: z.string().uuid(),
});

export const publishGallerySchema = galleryIdSchema;
