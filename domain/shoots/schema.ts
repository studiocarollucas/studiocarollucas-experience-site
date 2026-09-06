import { z } from "zod";

export const shootStatusValues = [
  "reserva",
  "preparacao",
  "realizado",
  "edicao",
  "finalizado",
  "reveal",
  "entregue",
  "cancelado",
  "reagendado",
] as const;

// Mirrors the shoot_payment_status Postgres enum. Kept exported even though
// createShootSchema deliberately does not accept this field (see the note there):
// Epic 2's payment-registration action needs these values to type the status it
// writes, and domain/payments/balance.ts's deriveShootPaymentStatus() returns a
// subset of them.
export const shootPaymentStatusValues = ["nao_iniciado", "parcial", "pago", "reembolsado", "cancelado"] as const;

export const createShootSchema = z.object({
  clientId: z.string().uuid(),
  experiencePackageId: z.string().uuid(),
  // `shoots.shoot_date` is a Postgres `date` and `shoots.start_time` a `time` —
  // validate both here so malformed input is rejected by Zod before the insert.
  shootDate: z.iso.date(), // "YYYY-MM-DD", e.g. "2026-12-01"
  startTime: z.iso.time().optional(), // "HH:mm" or "HH:mm:ss"
  locationName: z.string().trim().max(120).optional(),
  locationAddress: z.string().trim().max(300).optional(),
  clientGuidance: z.string().trim().max(2000).optional(),
  status: z.enum(shootStatusValues).default("reserva"),
  agreedPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "must be a decimal string like \"1200.00\""),
  // NOTE: `paymentStatus` is deliberately absent from this schema. db/schema/shoots.ts
  // documents the column as cached/denormalized and never user-editable — it may only
  // be written by the payment-registration domain function (Epic 2's SCL-220, via
  // deriveShootPaymentStatus()). Exposing it as a caller-settable create field let
  // `createShoot({ ..., paymentStatus: "pago" })` succeed with zero Payment rows
  // behind it — exactly the "two sources of financial truth" PRD §7.5 forbids. At
  // creation time the Postgres column default ('nao_iniciado') supplies the value.
  participantCount: z.number().int().positive().optional(),
  occasion: z.string().optional(),
  referral: z.string().optional(),
  notes: z.string().optional(),
  portalEnabled: z.boolean().default(false),
});

// z.input (not z.infer/z.output): see docs/DECISIONS.md, 2026-09-04 — `status` and
// `portalEnabled` both use `.default()`, so z.infer would make them required fields
// in the type even though Zod itself treats them as optional
// pre-parse. z.input matches the pre-parse shape, consistent with
// domain/clients/schema.ts's CreateClientInput and domain/leads/schema.ts's
// CreateLeadInput.
export type CreateShootInput = z.input<typeof createShootSchema>;

// paymentStatus is deliberately excluded — it is a derived cache written only by
// the payment-registration action (SCL-220). Status changes go through
// changeShootStatusAction (SCL-231-adjacent), not this generic update.
export const updateShootSchema = z.object({
  startTime: z.iso.time().optional(),
  locationName: z.string().trim().max(120).optional(),
  locationAddress: z.string().trim().max(300).optional(),
  clientGuidance: z.string().trim().max(2000).optional(),
  agreedPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "must be a decimal string like \"1200.00\"")
    .optional(),
  participantCount: z.coerce.number().int().positive().optional(),
  occasion: z.string().optional(),
  referral: z.string().optional(),
  notes: z.string().optional(),
  portalEnabled: z.coerce.boolean().optional(),
});

export type UpdateShootInput = z.input<typeof updateShootSchema>;
