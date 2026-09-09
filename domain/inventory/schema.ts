import { z } from "zod";

export const inventoryItemTypeValues = ["outfit", "clutch", "accessory", "prop"] as const;
export const inventoryItemStatusValues = ["available", "maintenance", "retired"] as const;

const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/, "must be a non-negative decimal string like \"300.00\"");

export const createInventoryItemSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  type: z.enum(inventoryItemTypeValues),
  color: z.string().trim().optional(),
  size: z.string().trim().optional(),
  status: z.enum(inventoryItemStatusValues).default("available"),
  active: z.boolean().default(true),
  internalPrice: decimalString.optional(),
});

export type CreateInventoryItemInput = z.input<typeof createInventoryItemSchema>;
