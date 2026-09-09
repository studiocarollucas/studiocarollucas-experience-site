const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

export function galleryAssetPath(galleryId: string, assetId: string, extension: string): string {
  if (!allowedExtensions.has(extension)) {
    throw new Error("extensão de arquivo da galeria não permitida");
  }

  return `gallery-assets/${galleryId}/${assetId}.${extension}`;
}
