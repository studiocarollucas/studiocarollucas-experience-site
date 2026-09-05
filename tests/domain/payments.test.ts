import { describe, it, expect } from "vitest";
import { createPaymentSchema, createExpenseSchema } from "@/domain/payments/schema";

describe("createPaymentSchema", () => {
  const validBase = {
    shootId: "00000000-0000-4000-8000-000000000001",
    amount: "300.00",
  };

  it("accepts a minimal valid payment", () => {
    expect(createPaymentSchema.safeParse(validBase).success).toBe(true);
  });

  it("defaults status to pendente", () => {
    expect(createPaymentSchema.parse(validBase).status).toBe("pendente");
  });

  it("rejects a missing shootId", () => {
    const { shootId, ...rest } = validBase;
    expect(createPaymentSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a malformed amount", () => {
    expect(createPaymentSchema.safeParse({ ...validBase, amount: "not-a-number" }).success).toBe(false);
  });

  // A refund is a payment row with status "estornado", never a negative amount. A
  // negative amount on a "confirmado" row would be subtracted by balance.ts's
  // sumConfirmed(), silently inflating the reported balance. Also enforced at the
  // database level by db/migrations/0021_money_check_constraints.sql.
  it("rejects a negative amount", () => {
    expect(createPaymentSchema.safeParse({ ...validBase, amount: "-500.00" }).success).toBe(false);
  });

  it("accepts a paidAt with an explicit offset and rejects a malformed one", () => {
    expect(createPaymentSchema.safeParse({ ...validBase, paidAt: "2026-12-01T14:30:00Z" }).success).toBe(true);
    expect(createPaymentSchema.safeParse({ ...validBase, paidAt: "2026-12-01T14:30:00-03:00" }).success).toBe(true);
    expect(createPaymentSchema.safeParse({ ...validBase, paidAt: "not-a-datetime" }).success).toBe(false);
    // No timezone offset: ambiguous instant for a `timestamp with time zone` column.
    expect(createPaymentSchema.safeParse({ ...validBase, paidAt: "2026-12-01T14:30:00" }).success).toBe(false);
  });
});

describe("createExpenseSchema", () => {
  const validBase = {
    date: "2026-12-01",
    type: "custo" as const,
    amount: "150.00",
  };

  it("accepts a minimal valid expense", () => {
    expect(createExpenseSchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects a malformed date", () => {
    expect(createExpenseSchema.safeParse({ ...validBase, date: "not-a-date" }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ ...validBase, date: "01/12/2026" }).success).toBe(false);
  });

  // Same shared `decimalString` schema as createPaymentSchema.amount above.
  it("rejects a negative amount", () => {
    expect(createExpenseSchema.safeParse({ ...validBase, amount: "-150.00" }).success).toBe(false);
  });
});
