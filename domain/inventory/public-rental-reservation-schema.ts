import { z } from "zod";

export const brazilianWhatsAppMessage = "Informe um WhatsApp brasileiro com DDD, com ou sem o código 55.";

export function normalizeBrazilianWhatsApp(value: string): string | null {
  const raw = value.trim();
  if (raw.length > 30 || !/^\+?[\d\s().-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  // An explicit international prefix must never be interpreted as a local DDD.
  if (raw.startsWith("+") || digits.length > 11) {
    return /^55\d{10,11}$/.test(digits) ? digits : null;
  }
  return /^\d{10,11}$/.test(digits) ? `55${digits}` : null;
}

export const brazilianWhatsAppSchema = z.string().transform((value, ctx) => {
  const phone = normalizeBrazilianWhatsApp(value);
  if (!phone) {
    ctx.addIssue({ code: "custom", message: brazilianWhatsAppMessage });
    return z.NEVER;
  }
  return phone;
});

export const publicClutchRentalRequestSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  startsOn: z.string().date(),
  endsOn: z.string().date(),
  guestName: z.string().trim().min(2).max(120),
  guestPhone: brazilianWhatsAppSchema,
  guestEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
}).refine(({ startsOn, endsOn }) => endsOn >= startsOn, {
  path: ["endsOn"], message: "devolução anterior à retirada",
});

export type PublicClutchRentalRequestInput = z.infer<typeof publicClutchRentalRequestSchema>;

export type PublicRentalReservationResult = {
  reservationCode: string;
  status: "pending";
  expiresAt: string;
};

export const publicClutchRentalDecisionSchema = z.object({
  reservationId: z.string().uuid(),
  decision: z.enum(["approve", "release"]),
});

export type PublicClutchRentalDecisionInput = z.infer<typeof publicClutchRentalDecisionSchema>;
