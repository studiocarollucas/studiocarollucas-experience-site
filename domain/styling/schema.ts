import { z } from "zod";

export const STYLING_BUCKET = "styling-references";
export const MAX_STYLING_REFERENCES = 20;
export const MAX_STYLING_FILE_BYTES = 8 * 1024 * 1024;
export const STYLING_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const UUID_PATH_SEGMENT =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const OBJECT_KEY_SEGMENT = "(?!\\.{1,2}$)[^/]+";
const STYLING_PATH_PATTERN = new RegExp(
  `^${UUID_PATH_SEGMENT}/${UUID_PATH_SEGMENT}/${OBJECT_KEY_SEGMENT}$`,
);

export const stylingStoragePathSchema = z
  .string()
  .min(1)
  .max(500)
  .regex(STYLING_PATH_PATTERN, "O caminho da referência é inválido.");

export const createStylingReferenceSchema = z.object({
  shootId: z.string().uuid(),
  storagePath: stylingStoragePathSchema,
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
