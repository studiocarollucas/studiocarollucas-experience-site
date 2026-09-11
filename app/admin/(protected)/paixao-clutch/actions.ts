"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionableAdminActionError, defineAdminAction } from "@/lib/auth/admin-action";
import { findPaixaoClutchSlugForRevalidation, updatePaixaoClutch, reorderPaixaoClutch, uploadInventoryPublicMedia, promoteInventoryMedia, removeInventoryPublicMedia } from "@/domain/inventory/clutch";
import { updatePaixaoClutchSchema, reorderPaixaoClutchSchema, publicInventoryMediaFileSchema, promoteInventoryMediaSchema, removeInventoryPublicMediaSchema } from "@/domain/inventory/clutch-schema";
import { readInventoryMediaUrls } from "@/domain/inventory/media";
import { PublicInventoryMediaError } from "@/domain/inventory/public-media";

function revalidatePublicPaixaoClutch(slug: string | null) {
  revalidatePath("/");
  revalidatePath("/paixao-clutch");
  if (slug) revalidatePath(`/paixao-clutch/${slug}`);
}

async function revalidateMedia(itemId: string) {
  revalidatePath("/admin/paixao-clutch");
  revalidatePath("/admin/inventario");
  revalidatePath(`/admin/inventario/${itemId}`);
  revalidatePublicPaixaoClutch(await findPaixaoClutchSlugForRevalidation(itemId));
}

async function changeMedia<T>(itemId: string, change: () => Promise<T>): Promise<T> {
  try {
    return await change();
  } catch (error) {
    if (error instanceof PublicInventoryMediaError) {
      throw new ActionableAdminActionError(error.message);
    }
    throw error;
  } finally {
    // A lifecycle failure can still commit an image or unpublish the item.
    await revalidateMedia(itemId);
  }
}

export const readPaixaoClutchPrivateMediaAction = defineAdminAction(
  { role: "staff", input: removeInventoryPublicMediaSchema },
  async ({ itemId }) => (await readInventoryMediaUrls(itemId)).map(({ id, signedUrl }) => ({ id, signedUrl })),
);

export const uploadInventoryPublicMediaAction = defineAdminAction(
  { role: "staff", input: z.object({
    itemId: z.string().uuid(),
    file: z.custom<File>((value) => value instanceof File, "Selecione um arquivo.").refine(
      (file) => publicInventoryMediaFileSchema.safeParse(file).success,
      "Envie uma imagem JPEG, PNG ou WebP de até 4 MB.",
    ),
  }).strict() },
  async (input, ctx) => {
    const media = await changeMedia(input.itemId, () => uploadInventoryPublicMedia(input, ctx.user.id));
    return { publicPath: media.publicPath };
  },
);

export const promoteInventoryMediaAction = defineAdminAction(
  { role: "staff", input: promoteInventoryMediaSchema },
  async (input, ctx) => {
    const media = await changeMedia(input.itemId, () => promoteInventoryMedia(input, ctx.user.id));
    return { publicPath: media.publicPath };
  },
);

export const removeInventoryPublicMediaAction = defineAdminAction(
  { role: "staff", input: removeInventoryPublicMediaSchema },
  async (input, ctx) => {
    try {
      await removeInventoryPublicMedia(input, ctx.user.id);
      return { publicPath: null };
    } catch (error) {
      // This domain error is emitted only after unpublication commits. Keep that
      // state available even when filtered RSC props no longer contain the item.
      if (error instanceof PublicInventoryMediaError) {
        return { publicPath: null, cleanupError: error.message };
      }
      throw error;
    } finally {
      await revalidateMedia(input.itemId);
    }
  },
);

export const updatePaixaoClutchAction = defineAdminAction(
  { role: "staff", input: updatePaixaoClutchSchema },
  async (input, ctx) => {
    const item = await updatePaixaoClutch(input, ctx.user.id);
    revalidatePath("/admin/paixao-clutch");
    revalidatePath("/admin/inventario");
    revalidatePath(`/admin/inventario/${item.id}`);
    revalidatePublicPaixaoClutch(item.paixaoClutchSlug);
    return { id: item.id };
  }
);

export const reorderPaixaoClutchAction = defineAdminAction(
  { role: "staff", input: reorderPaixaoClutchSchema },
  async (input, ctx) => {
    await reorderPaixaoClutch(input, ctx.user.id);
    revalidatePath("/admin/paixao-clutch");
    revalidatePublicPaixaoClutch(null);
    return { reordered: true };
  }
);
