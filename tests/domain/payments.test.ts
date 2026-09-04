import { describe, it, expect } from "vitest";
import { createPaymentSchema } from "@/domain/payments/schema";

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
});
