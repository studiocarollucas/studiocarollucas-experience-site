"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ActionableAdminActionError, defineAdminAction } from "@/lib/auth/admin-action";
import {
  createInventoryItem,
  updateInventoryItem,
  deactivateInventoryItem,
} from "@/domain/inventory/catalog";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
} from "@/domain/inventory/catalog-schema";
import { previewInventoryImport, commitInventoryImport, InventoryImportConfigurationError } from "@/domain/inventory/import";
import {
  uploadInventoryMedia,
  setInventoryMediaCover,
  removeInventoryMedia,
  reorderInventoryMedia,
} from "@/domain/inventory/media";
import {
  inventoryMediaFileSchema,
  setInventoryMediaCoverSchema,
  reorderInventoryMediaSchema,
} from "@/domain/inventory/media-schema";

const itemId = z.string().uuid("Item do acervo inválido.");
const fileSchema = z.custom<File>((value) => value instanceof File, "Selecione um arquivo.");

function revalidateInventory(id?: string) {
  revalidatePath("/admin/inventario");
  if (id) revalidatePath(`/admin/inventario/${id}`);
  else revalidatePath("/admin/inventario/[id]", "page");
  revalidatePath("/admin/agenda/[id]", "page");
}

async function catalogChange<T>(change: () => Promise<T>): Promise<T> {
  try {
    return await change();
  } catch (error) {
    if (error instanceof Error && error.message === "código já cadastrado") {
      throw new ActionableAdminActionError("Este código já pertence a outro item.", {
        code: ["Use um código ainda não cadastrado."],
      });
    }
    throw error;
  }
}

export const createInventoryItemAction = defineAdminAction(
  { role: "staff", input: createInventoryItemSchema },
  async (input, ctx) => {
    const item = await catalogChange(() => createInventoryItem(input, ctx.user.id));
    revalidateInventory(item.id);
    return { id: item.id };
  }
);

export const updateInventoryItemAction = defineAdminAction(
  { role: "staff", input: updateInventoryItemSchema.safeExtend({ id: itemId }) },
  async ({ id, ...input }, ctx) => {
    const item = await catalogChange(() => updateInventoryItem(id, input, ctx.user.id));
    revalidateInventory(item.id);
    return { id: item.id };
  }
);

export const deactivateInventoryItemAction = defineAdminAction(
  { role: "staff", input: z.object({ id: itemId }) },
  async ({ id }, ctx) => {
    await deactivateInventoryItem(id, ctx.user.id);
    revalidateInventory(id);
    return { id };
  }
);

export const previewInventoryImportAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({
      file: fileSchema.refine(
        (file) =>
          file.name.toLowerCase().endsWith(".xlsx") &&
          file.size > 0 &&
          file.size <= 4 * 1024 * 1024,
        "Envie uma planilha XLSX de até 4 MB."
      ),
    }),
  },
  async ({ file }) => {
    try {
      return await previewInventoryImport(file);
    } catch (error) {
      if (error instanceof InventoryImportConfigurationError) {
        throw new ActionableAdminActionError(error.message);
      }
      throw new ActionableAdminActionError(
        "Não foi possível ler a planilha. Use o modelo XLSX com a aba Acervo e tente novamente.",
        { file: ["Confira o formato e a aba Acervo."] }
      );
    }
  }
);

export const commitInventoryImportAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({
      previewToken: z.string().min(1),
      selectedRowNumbers: z
        .array(z.number().int().min(2))
        .min(1, "Selecione ao menos uma linha válida."),
    }),
  },
  async ({ previewToken, selectedRowNumbers }, ctx) => {
    let result;
    try {
      result = await commitInventoryImport(previewToken, selectedRowNumbers, ctx.user.id);
    } catch (error) {
      if (error instanceof InventoryImportConfigurationError) {
        throw new ActionableAdminActionError(error.message);
      }
      if (
        error instanceof Error &&
        [
          "prévia de importação expirada ou inválida",
          "um código selecionado já foi cadastrado",
        ].includes(error.message)
      ) {
        throw new ActionableAdminActionError(
          "A prévia expirou ou um código foi cadastrado desde a leitura. Gere uma nova prévia antes de confirmar."
        );
      }
      throw error;
    }
    revalidateInventory();
    return result;
  }
);

export const uploadInventoryMediaAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({
      inventoryItemId: itemId,
      file: fileSchema.refine(
        (file) => inventoryMediaFileSchema.safeParse(file).success && file.size <= 4 * 1024 * 1024,
        "Envie uma imagem JPEG, PNG ou WebP de até 4 MB."
      ),
    }),
  },
  async (input, ctx) => {
    const media = await uploadInventoryMedia(input, ctx.user.id);
    revalidateInventory(input.inventoryItemId);
    return { id: media.id };
  }
);

export const setInventoryMediaCoverAction = defineAdminAction(
  { role: "staff", input: setInventoryMediaCoverSchema },
  async (input, ctx) => {
    await setInventoryMediaCover(input, ctx.user.id);
    revalidateInventory(input.inventoryItemId);
    return { id: input.mediaId };
  }
);

export const removeInventoryMediaAction = defineAdminAction(
  { role: "staff", input: setInventoryMediaCoverSchema },
  async (input, ctx) => {
    await removeInventoryMedia(input, ctx.user.id);
    revalidateInventory(input.inventoryItemId);
    return { id: input.mediaId };
  }
);

export const reorderInventoryMediaAction = defineAdminAction(
  { role: "staff", input: reorderInventoryMediaSchema },
  async (input, ctx) => {
    await reorderInventoryMedia(input, ctx.user.id);
    revalidateInventory(input.inventoryItemId);
    return { id: input.inventoryItemId };
  }
);
