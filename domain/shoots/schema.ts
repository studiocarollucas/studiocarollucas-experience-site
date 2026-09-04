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

export const shootPaymentStatusValues = ["nao_iniciado", "parcial", "pago", "reembolsado", "cancelado"] as const;

export const createShootSchema = z.object({
  clientId: z.string().uuid(),
  experiencePackageId: z.string().uuid(),
  shootDate: z.string(), // ISO date, e.g. "2026-12-01"
  startTime: z.string().optional(), // "HH:mm" or "HH:mm:ss"
  status: z.enum(shootStatusValues).default("reserva"),
  agreedPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "must be a decimal string like \"1200.00\""),
  paymentStatus: z.enum(shootPaymentStatusValues).default("nao_iniciado"),
  participantCount: z.number().int().positive().optional(),
  occasion: z.string().optional(),
  referral: z.string().optional(),
  notes: z.string().optional(),
  portalEnabled: z.boolean().default(false),
});

// z.input (not z.infer/z.output): see docs/DECISIONS.md, 2026-09-04 — `status`,
// `paymentStatus`, and `portalEnabled` all use `.default()`, so z.infer would make
// them required fields in the type even though Zod itself treats them as optional
// pre-parse. z.input matches the pre-parse shape, consistent with
// domain/clients/schema.ts's CreateClientInput and domain/leads/schema.ts's
// CreateLeadInput.
export type CreateShootInput = z.input<typeof createShootSchema>;
