import { z } from "zod";

const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "informe um valor decimal não negativo");

export const updatePaixaoClutchSchema = z.object({
  itemId: z.string().uuid(),
  rentalPrice: money.optional(),
  replacementValue: money.optional(),
  copy: z.string().trim().max(280).optional(),
  publicImagePath: z.string().trim().max(500).optional(),
  published: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export type UpdatePaixaoClutchInput = z.input<typeof updatePaixaoClutchSchema>;

export type PaixaoClutchAdminFilters = {
  active?: boolean;
  published?: boolean;
  featured?: boolean;
};
