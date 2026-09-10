import { z } from "zod";

const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "informe um valor decimal não negativo")
  .refine((value) => Number(value) <= 99999999.99, "O valor máximo é 99999999.99.");

// Canonical, same-origin static asset reference, separate from inventory-media.
// No URL signing, private object lookup, decoding or automatic media promotion.
export const paixaoClutchPublicImagePathSchema = z.string().max(200).regex(
  /^\/images\/paixao-clutch\/[a-z0-9][a-z0-9_-]*\.(?:jpg|jpeg|png|webp)$/,
  "Use /images/paixao-clutch/nome-do-arquivo.jpg (ou png/webp), de uma imagem pública própria.",
);

export const updatePaixaoClutchSchema = z.object({
  itemId: z.string().uuid(),
  eligible: z.boolean(),
  rentalPrice: money.optional(),
  replacementValue: money.optional(),
  copy: z.string().trim().max(280).optional(),
  publicImagePath: paixaoClutchPublicImagePathSchema.optional(),
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
