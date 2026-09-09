const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

export function inventoryMediaPath(inventoryItemId: string, mediaId: string, extension: string): string {
  if (!allowedExtensions.has(extension)) {
    throw new Error("extensão de mídia do inventário não permitida");
  }

  return `inventory-media/${inventoryItemId}/${mediaId}.${extension}`;
}
