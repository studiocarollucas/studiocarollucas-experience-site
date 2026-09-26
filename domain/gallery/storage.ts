const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

export const GALLERY_BUCKET = "gallery-assets";

export function galleryAssetPath(galleryId: string, assetId: string, extension: string): string {
  if (!allowedExtensions.has(extension)) {
    throw new Error("extensão de arquivo da galeria não permitida");
  }

  return `gallery-assets/${galleryId}/${assetId}.${extension}`;
}

/**
 * File name offered to the browser on download (Content-Disposition). It never
 * contains the storage path or gallery id — only a short asset prefix.
 */
export function galleryDownloadFileName(assetId: string, storagePath: string): string {
  const extension = storagePath.split(".").pop()?.toLowerCase() ?? "";
  const safeExtension = allowedExtensions.has(extension) ? extension : "jpg";
  const prefix = assetId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "foto";
  return `studio-carol-lucas-${prefix}.${safeExtension}`;
}
