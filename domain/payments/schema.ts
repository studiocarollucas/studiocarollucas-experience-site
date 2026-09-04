import { z } from "zod";

export const paymentEntryStatusValues = ["pendente", "confirmado", "estornado"] as const;

const decimalString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, "must be a decimal string like \"300.00\"");

export const createPaymentSchema = z.object({
  shootId: z.string().uuid(),
  amount: decimalString,
  paidAt: z.string().optional(), // ISO datetime
  method: z.string().optional(),
  status: z.enum(paymentEntryStatusValues).default("pendente"),
  proofUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

// z.input (not z.infer/z.output): see docs/DECISIONS.md, 2026-09-04 — `status` has
// a `.default()`, so z.infer would make it a required field in the type even
// though Zod itself treats it as optional pre-parse. z.input matches the pre-parse
// shape, consistent with domain/clients/schema.ts, domain/leads/schema.ts, and
// domain/shoots/schema.ts.
export type CreatePaymentInput = z.input<typeof createPaymentSchema>;

export const expenseTypeValues = ["custo", "investimento", "funcionario"] as const;

export const createExpenseSchema = z.object({
  date: z.string(), // ISO date
  type: z.enum(expenseTypeValues),
  category: z.string().optional(),
  amount: decimalString,
  method: z.string().optional(),
  recurring: z.boolean().default(false),
  proofUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

// Same z.input rationale as CreatePaymentInput above: `recurring` has a `.default()`.
export type CreateExpenseInput = z.input<typeof createExpenseSchema>;
