import { describe, it, expect } from "vitest";
import { createShootSchema } from "@/domain/shoots/schema";

describe("createShootSchema", () => {
  const validBase = {
    clientId: "00000000-0000-4000-8000-000000000001",
    experiencePackageId: "00000000-0000-4000-8000-000000000002",
    shootDate: "2026-12-01",
    agreedPrice: "1200.00",
  };

  it("accepts a minimal valid shoot", () => {
    expect(createShootSchema.safeParse(validBase).success).toBe(true);
  });

  it("defaults status to reserva and paymentStatus to nao_iniciado", () => {
    const parsed = createShootSchema.parse(validBase);
    expect(parsed.status).toBe("reserva");
    expect(parsed.paymentStatus).toBe("nao_iniciado");
  });

  it("rejects a missing clientId", () => {
    const { clientId, ...rest } = validBase;
    expect(createShootSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an invalid clientId (not a uuid)", () => {
    expect(createShootSchema.safeParse({ ...validBase, clientId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects a missing agreedPrice", () => {
    const { agreedPrice, ...rest } = validBase;
    expect(createShootSchema.safeParse(rest).success).toBe(false);
  });
});
