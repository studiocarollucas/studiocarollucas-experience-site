import { describe, it, expect } from "vitest";
import { calculateBalance, deriveShootPaymentStatus } from "@/domain/payments/balance";

describe("calculateBalance", () => {
  it("returns the full agreed price when there are no payments", () => {
    expect(calculateBalance("1000.00", [])).toBe("1000.00");
  });

  it("subtracts only confirmed payments", () => {
    const payments = [
      { amount: "300.00", status: "confirmado" as const },
      { amount: "200.00", status: "pendente" as const },
      { amount: "100.00", status: "estornado" as const },
    ];
    expect(calculateBalance("1000.00", payments)).toBe("700.00");
  });

  it("returns zero balance when confirmed payments equal the agreed price", () => {
    const payments = [{ amount: "1000.00", status: "confirmado" as const }];
    expect(calculateBalance("1000.00", payments)).toBe("0.00");
  });

  it("returns a negative balance when confirmed payments exceed the agreed price (overpayment, not clamped)", () => {
    const payments = [{ amount: "1200.00", status: "confirmado" as const }];
    expect(calculateBalance("1000.00", payments)).toBe("-200.00");
  });
});

describe("deriveShootPaymentStatus", () => {
  it("is nao_iniciado when there are no confirmed payments", () => {
    expect(deriveShootPaymentStatus("1000.00", [])).toBe("nao_iniciado");
  });

  it("is parcial when some but not all of the agreed price is confirmed-paid", () => {
    const payments = [{ amount: "400.00", status: "confirmado" as const }];
    expect(deriveShootPaymentStatus("1000.00", payments)).toBe("parcial");
  });

  it("is pago when confirmed payments meet or exceed the agreed price", () => {
    const payments = [{ amount: "1000.00", status: "confirmado" as const }];
    expect(deriveShootPaymentStatus("1000.00", payments)).toBe("pago");

    const overpaid = [{ amount: "1100.00", status: "confirmado" as const }];
    expect(deriveShootPaymentStatus("1000.00", overpaid)).toBe("pago");
  });

  it("ignores pendente and estornado payments entirely", () => {
    const payments = [
      { amount: "1000.00", status: "pendente" as const },
      { amount: "1000.00", status: "estornado" as const },
    ];
    expect(deriveShootPaymentStatus("1000.00", payments)).toBe("nao_iniciado");
  });
});
