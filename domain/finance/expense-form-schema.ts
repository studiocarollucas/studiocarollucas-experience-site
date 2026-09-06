import { z } from "zod";
import { createExpenseSchema } from "@/domain/payments/schema";

// createExpenseSchema (Epic 1, frozen) already validates `date` as z.iso.date() and
// `type` as z.enum(expenseTypeValues), so no override is needed for those. The only
// form-specific concern is the `recurring` checkbox: toFormAction() normalizes a
// declared boolean field to a real `true`/`false`, and z.coerce.boolean() keeps that
// value while still defaulting an absent field to `false`.
export const expenseFormSchema = createExpenseSchema.extend({
  recurring: z.coerce.boolean().default(false),
});

export type ExpenseFormValues = z.input<typeof expenseFormSchema>;
