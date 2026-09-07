import { z } from "zod";

export const STYLING_BUCKET = "styling-references";
export const MAX_STYLING_REFERENCES = 20;
export const MAX_STYLING_FILE_BYTES = 8 * 1024 * 1024;
export const STYLING_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const createStylingReferenceSchema = z.object({
  shootId: z.string().uuid(),
  storagePath: z.string().min(1).max(500),
  caption: z.string().trim().max(500).optional(),
  origin: z.enum(["client", "studio"]),
  uploadedByAuthUserId: z.string().uuid().nullable(),
});

export function validateStylingFile(file: { type: string; size: number }): string | null {
  if (!(STYLING_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Envie uma imagem JPG, PNG ou WebP.";
  }
  if (file.size > MAX_STYLING_FILE_BYTES) {
    return "A imagem deve ter no máximo 8 MB.";
  }
  return null;
}
