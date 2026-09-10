import { z } from "zod";

const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "informe um valor decimal não negativo")
  .refine((value) => Number(value) <= 99999999.99, "O valor máximo é 99999999.99.");

export const updatePaixaoClutchSchema = z.object({
  itemId: z.string().uuid(),
  eligible: z.boolean(),
  rentalPrice: money.optional(),
  replacementValue: money.optional(),
  copy: z.string().trim().max(280).optional(),
  published: z.boolean(),
  featured: z.boolean(),
}).strict();

export const reorderPaixaoClutchSchema = z.object({
  itemIds: z.array(z.string().uuid()).max(1000).refine(
    (ids) => new Set(ids).size === ids.length,
    "A lista de publicados não pode repetir itens.",
  ),
}).strict();

export type ReorderPaixaoClutchInput = z.input<typeof reorderPaixaoClutchSchema>;

export type UpdatePaixaoClutchInput = z.input<typeof updatePaixaoClutchSchema>;

export type PaixaoClutchAdminFilters = {
  active?: boolean;
  published?: boolean;
  featured?: boolean;
};

export const publicInventoryMediaFileSchema = z.object({
  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().positive().max(4 * 1024 * 1024, "A imagem pública deve ter até 4 MB."),
});
export const uploadInventoryPublicMediaSchema = z.object({ itemId: z.string().uuid(), file: publicInventoryMediaFileSchema }).strict();
export const promoteInventoryMediaSchema = z.object({ itemId: z.string().uuid(), mediaId: z.string().uuid() }).strict();
export const removeInventoryPublicMediaSchema = z.object({ itemId: z.string().uuid() }).strict();
