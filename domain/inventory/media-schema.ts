import { z } from "zod";

export const inventoryMediaMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const maxInventoryMediaBytes = 20 * 1024 * 1024;

const inventoryItemIdSchema = z.string().uuid();
const inventoryMediaIdSchema = z.string().uuid();

export const inventoryMediaFileSchema = z.object({
  type: z.enum(inventoryMediaMimeTypes),
  size: z.number().positive().max(maxInventoryMediaBytes),
});

export const uploadInventoryMediaSchema = z.object({
  inventoryItemId: inventoryItemIdSchema,
  file: inventoryMediaFileSchema,
});

export const setInventoryMediaCoverSchema = z.object({
  inventoryItemId: inventoryItemIdSchema,
  mediaId: inventoryMediaIdSchema,
});

export const removeInventoryMediaSchema = setInventoryMediaCoverSchema;
export const readInventoryMediaUrlsSchema = inventoryItemIdSchema;
