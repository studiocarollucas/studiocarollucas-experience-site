import { z } from "zod";

export const paymentEntryStatusValues = ["pendente", "confirmado", "estornado"] as const;

// Non-negative by design (no leading `-?`), and shared by both createPaymentSchema
// and createExpenseSchema below. A refund is modeled as a payment row with
// status "estornado", never as a negative amount — so a negative `amount` is always
// a data-entry error, and one on a "confirmado" row would be silently *subtracted*
// by balance.ts's sumConfirmed(), inflating the reported balance. Backed at the
// database level by the CHECK constraints in
// db/migrations/0021_money_check_constraints.sql.
// (This restricts the individual row `amount` only. A *balance* — agreed price minus
// confirmed payments — may still legitimately go negative on overpayment, and
// calculateBalance() deliberately does not clamp it.)
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/, "must be a non-negative decimal string like \"300.00\"");

export const createPaymentSchema = z.object({
  shootId: z.string().uuid(),
  amount: decimalString,
  // `payments.paid_at` is `timestamp with time zone` — require a full ISO datetime
  // carrying an explicit offset, so the instant is unambiguous rather than being
  // silently reinterpreted in the server's local zone.
  paidAt: z.iso.datetime({ offset: true }).optional(), // e.g. "2026-12-01T14:30:00-03:00"
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
  // `expenses.date` is a Postgres `date` column (not a timestamp), so a bare
  // calendar date is the right shape here.
  date: z.iso.date(), // "YYYY-MM-DD"
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
