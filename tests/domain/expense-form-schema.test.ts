import { describe, it, expect } from "vitest";
import { expenseFormSchema } from "@/domain/finance/expense-form-schema";

describe("expenseFormSchema", () => {
  const base = { date: "2026-09-10", type: "custo", amount: "900.00" };

  it("accepts a minimal expense and defaults recurring to false", () => {
    const r = expenseFormSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.recurring).toBe(false);
  });

  it("accepts a normalized boolean recurring", () => {
    const r = expenseFormSchema.safeParse({ ...base, recurring: true });
    expect(r.success && r.data.recurring).toBe(true);
  });

  it("rejects an unknown expense type", () => {
    expect(expenseFormSchema.safeParse({ ...base, type: "aleatorio" }).success).toBe(false);
  });

  it("rejects a malformed amount and a malformed date", () => {
    expect(expenseFormSchema.safeParse({ ...base, amount: "9,00" }).success).toBe(false);
    expect(expenseFormSchema.safeParse({ ...base, date: "10/09/2026" }).success).toBe(false);
  });
});
