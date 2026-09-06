import { describe, it, expect } from "vitest";
import { computeDashboardKpis, type DashboardInput } from "@/domain/dashboard/kpis";

const base: DashboardInput = {
  shoots: [
    { id: "s1", agreedPrice: "1000.00", status: "reserva", shootDate: "2026-09-10" },
    { id: "s2", agreedPrice: "2000.00", status: "edicao", shootDate: "2026-09-20" },
    { id: "s3", agreedPrice: "1500.00", status: "entregue", shootDate: "2026-09-25" },
  ],
  payments: [
    { shootId: "s1", amount: "500.00", status: "confirmado" },
    { shootId: "s2", amount: "2000.00", status: "confirmado" },
    { shootId: "s2", amount: "300.00", status: "pendente" },
    { shootId: "s3", amount: "1500.00", status: "estornado" },
  ],
  expenses: [{ amount: "400.00" }, { amount: "100.50" }],
};

describe("computeDashboardKpis", () => {
  it("counts shoots in the period", () => {
    expect(computeDashboardKpis(base).shootsInPeriod).toBe(3);
  });

  it("bills the sum of every shoot's agreed price", () => {
    expect(computeDashboardKpis(base).billed).toBe("4500.00");
  });

  it("receives only confirmed payments", () => {
    expect(computeDashboardKpis(base).received).toBe("2500.00");
  });

  it("computes receivable as billed minus received, not clamped below zero per-shoot but summed", () => {
    // s1: 1000-500=500 ; s2: 2000-2000=0 ; s3: 1500-0=1500  => 2000.00
    expect(computeDashboardKpis(base).receivable).toBe("2000.00");
  });

  it("sums expenses and derives operating result (received minus expenses)", () => {
    expect(computeDashboardKpis(base).expenses).toBe("500.50");
    expect(computeDashboardKpis(base).result).toBe("1999.50");
  });

  it("average ticket is billed over shoot count", () => {
    expect(computeDashboardKpis(base).averageTicket).toBe("1500.00");
  });

  it("average ticket is 0.00 with no shoots", () => {
    expect(computeDashboardKpis({ shoots: [], payments: [], expenses: [] }).averageTicket).toBe("0.00");
  });

  it("counts production-in-progress (edicao/realizado) and finished (finalizado/reveal/entregue)", () => {
    const k = computeDashboardKpis(base);
    expect(k.productionInProgress).toBe(1);
    expect(k.finishedShoots).toBe(1);
  });
});
