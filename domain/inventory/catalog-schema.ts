import { z } from "zod";
import { createInventoryItemSchema } from "./schema";

export const updateInventoryItemSchema = createInventoryItemSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, "informe ao menos um campo");

export type UpdateInventoryItemInput = z.input<typeof updateInventoryItemSchema>;

export { createInventoryItemSchema };
