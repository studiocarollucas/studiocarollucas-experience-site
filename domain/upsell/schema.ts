import { z } from "zod";
import { upsellOrderStatusValues, upsellProductKindValues } from "@/db/schema/upsell";
import { createPaymentSchema } from "@/domain/payments/schema";
import { MAX_UPSELL_ITEM_QUANTITY, MAX_UPSELL_ORDER_ITEMS } from "./rules";

// Same decimal convention as payments/packages (numeric(10,2), non-negative).
const decimalString = z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, "Informe um valor como 350.00.");
const optionalText = (max: number) => z.string().trim().max(max).optional();

// ─── SCL-506: catalog ──────────────────────────────────────────────────────────

export const upsellProductSchema = z.object({
  kind: z.enum(upsellProductKindValues),
  name: z.string().trim().min(1, "Informe o nome.").max(100),
  description: optionalText(1000),
  internalNotes: optionalText(2000),
  price: decimalString,
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateUpsellProductSchema = upsellProductSchema.extend({ id: z.string().uuid() });
export const deleteUpsellProductSchema = z.object({ id: z.string().uuid() });

// z.input: `active`/`sortOrder` have defaults (docs/DECISIONS.md, 2026-09-04).
export type UpsellProductInput = z.input<typeof upsellProductSchema>;

export const galleryUpsellOffersSchema = z.object({
  galleryId: z.string().uuid(),
  productIds: z
    .array(z.string().uuid())
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, "Produtos repetidos."),
});

export type GalleryUpsellOffersInput = z.input<typeof galleryUpsellOffersSchema>;

// ─── SCL-507: orders ───────────────────────────────────────────────────────────

// The client's request carries only what she chose. No client id, price or
// total is accepted: unknown keys are stripped and the server prices the order.
export const upsellOrderRequestSchema = z.object({
  galleryId: z.string().uuid(),
  requestKey: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(MAX_UPSELL_ITEM_QUANTITY),
      }),
    )
    .min(1, "Escolha ao menos um produto.")
    .max(MAX_UPSELL_ORDER_ITEMS),
  notes: optionalText(1000),
});

export type UpsellOrderRequestInput = z.input<typeof upsellOrderRequestSchema>;

export const upsellOrderStatusChangeSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(upsellOrderStatusValues),
});

export type UpsellOrderStatusChangeInput = z.input<typeof upsellOrderStatusChangeSchema>;

// Same fields and validation as a Shoot payment; the Shoot comes from the order.
export const upsellPaymentSchema = createPaymentSchema.omit({ shootId: true }).extend({
  orderId: z.string().uuid(),
});

export type UpsellPaymentInput = z.input<typeof upsellPaymentSchema>;
