import { z } from "zod";

export const leadStatusValues = ["novo", "contato", "proposta", "negociacao", "ganho", "perdido"] as const;

export const createLeadSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.string().min(1),
  occasion: z.string().optional(),
  quizResult: z.string().optional(),
  status: z.enum(leadStatusValues).default("novo"),
  lostReason: z.string().optional(),
  owner: z.string().uuid().optional(),
});

export const transitionLeadStatusSchema = z.object({
  leadId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  status: z.enum(leadStatusValues),
  lostReason: z.string().trim().max(500).optional(),
});

// z.input (not z.infer/z.output): see docs/DECISIONS.md, 2026-09-04 — `status` has
// `.default("novo")`, so z.infer would make it a required field in the type even
// though Zod itself treats it as optional pre-parse. z.input matches the pre-parse
// shape, consistent with domain/clients/schema.ts's CreateClientInput.
export type CreateLeadInput = z.input<typeof createLeadSchema>;
export type TransitionLeadStatusInput = z.input<typeof transitionLeadStatusSchema>;
