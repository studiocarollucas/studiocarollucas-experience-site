import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  instagramHandle: z.string().optional(),
  birthday: z.string().optional(), // ISO date string, e.g. "1994-03-12"
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
