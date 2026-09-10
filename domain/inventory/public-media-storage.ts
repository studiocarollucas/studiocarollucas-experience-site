import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicInventoryMediaFileSchema } from "./clutch-schema";

export const PUBLIC_INVENTORY_MEDIA_BUCKET = "paixao-clutch-media";
const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

export async function validatePublicInventoryMediaFile(file: File) {
  const metadata = publicInventoryMediaFileSchema.parse(file);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const startsWith = (signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
  const valid =
    metadata.type === "image/jpeg"
      ? startsWith([255, 216, 255])
      : metadata.type === "image/png"
        ? startsWith([137, 80, 78, 71, 13, 10, 26, 10])
        : startsWith([82, 73, 70, 70]) &&
          bytes[8] === 87 &&
          bytes[9] === 69 &&
          bytes[10] === 66 &&
          bytes[11] === 80;
  if (!valid) throw new Error("O conteúdo não corresponde ao tipo da imagem JPEG, PNG ou WebP.");
}

export function publicInventoryMediaPaths(itemId: string, id: string, file: File) {
  const metadata = publicInventoryMediaFileSchema.parse(file);
  const storagePath = `paixao-clutch/${itemId}/${id}.${extensions[metadata.type]}`;
  const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const publicPath = new URL(
    `/storage/v1/object/public/${PUBLIC_INVENTORY_MEDIA_BUCKET}/${storagePath}`,
    origin
  ).toString();
  return { storagePath, publicPath };
}

export async function publicInventoryMediaStorage() {
  const client = await createSupabaseServerClient();
  const bucket = client.storage.from(PUBLIC_INVENTORY_MEDIA_BUCKET);
  return {
    async upload(path: string, file: File) {
      const metadata = publicInventoryMediaFileSchema.parse(file);
      const result = await bucket.upload(path, file, {
        contentType: metadata.type,
        upsert: false,
        cacheControl: "0",
      });
      if (result.error || !result.data)
        throw result.error ?? new Error("Storage não confirmou a imagem pública.");
    },
    async remove(path: string) {
      const result = await bucket.remove([path]);
      if (result.error) throw result.error;
    },
    async downloadPrivate(path: string) {
      const result = await client.storage.from("inventory-media").download(path);
      if (result.error || !result.data)
        throw result.error ?? new Error("Mídia privada indisponível.");
      publicInventoryMediaFileSchema.parse(result.data);
      return new File([result.data], "public-image", { type: result.data.type });
    },
  };
}
