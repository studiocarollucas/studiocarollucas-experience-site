import { z } from "zod";
import {
  isValidCpf,
  isValidPostalCode,
  normalizeCpf,
  normalizePostalCode,
} from "../contracts/schema";

export const createClientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  instagramHandle: z.string().optional(),
  // `clients.birthday` is a Postgres `date` column — validate the ISO calendar-date
  // shape here so a malformed value is rejected by Zod before it reaches the insert,
  // instead of surfacing as a raw Postgres error (plan's Global Constraint: Zod
  // validates input *before* it reaches the database).
  birthday: z.iso.date().optional(), // "YYYY-MM-DD", e.g. "1994-03-12"
  cpf: z.string().transform(normalizeCpf).refine(isValidCpf, "CPF inválido").optional(),
  addressStreet: z.string().trim().min(1).max(180).optional(),
  addressNumber: z.string().trim().min(1).max(30).optional(),
  addressComplement: z.string().trim().max(120).optional(),
  addressNeighborhood: z.string().trim().min(1).max(120).optional(),
  addressCity: z.string().trim().min(1).max(120).optional(),
  addressState: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
  addressPostalCode: z.string().transform(normalizePostalCode).refine(isValidPostalCode, "CEP inválido").optional(),
  source: z.string().optional(),
  referrerClientId: z.string().uuid().optional(),
  styleProfile: z.string().optional(),
  notes: z.string().optional(),
  marketingConsent: z.boolean().default(false),
});

// z.input (not z.infer/z.output) here: z.infer resolves to the schema's *output*
// type, in which `marketingConsent` is a required boolean because `.default(false)`
// always produces one after parsing. z.input reflects the pre-parse shape instead,
// where a field with `.default()` is genuinely optional — matching how callers
// (see tests/domain/clients.test.ts's integration test, which omits
// marketingConsent entirely) are meant to use this type.
export type CreateClientInput = z.input<typeof createClientSchema>;

// Every field optional for a partial update; name still non-empty when present.
export const updateClientSchema = createClientSchema.partial().extend({
  name: z.string().min(1).optional(),
});

export type UpdateClientInput = z.input<typeof updateClientSchema>;
