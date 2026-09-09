import { z } from "zod";
import { createInventoryItemSchema } from "./schema";
import { inventoryItemStatusValues } from "./schema";

export const updateInventoryItemSchema = createInventoryItemSchema
  .partial()
  .extend({
    // Patch fields must not inherit creation defaults and reactivate an item.
    active: z.boolean().optional(),
    status: z.enum(inventoryItemStatusValues).optional(),
    internalPrice: createInventoryItemSchema.shape.internalPrice.nullable(),
  })
  .refine((input) => Object.keys(input).length > 0, "informe ao menos um campo");

export type UpdateInventoryItemInput = z.input<typeof updateInventoryItemSchema>;

export { createInventoryItemSchema };
