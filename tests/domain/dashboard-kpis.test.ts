import { describe, it, expect } from "vitest";
import {
  computeDashboardKpis,
  shootsNeedingPayment,
  type DashboardInput,
} from "@/domain/dashboard/kpis";

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

  it("a cancelado shoot with an open balance does not contribute to receivable", () => {
    const withCancelled: DashboardInput = {
      ...base,
      shoots: [...base.shoots, { id: "s4", agreedPrice: "900.00", status: "cancelado", shootDate: "2026-09-28" }],
    };
    // receivable is unchanged from the base case: the cancelled shoot's 900.00 is
    // money the studio will never collect, so it is not a receivable.
    expect(computeDashboardKpis(withCancelled).receivable).toBe("2000.00");
  });

  it("still bills and counts a cancelado shoot (a faithful 'was billed' figure)", () => {
    const withCancelled: DashboardInput = {
      ...base,
      shoots: [...base.shoots, { id: "s4", agreedPrice: "900.00", status: "cancelado", shootDate: "2026-09-28" }],
    };
    const k = computeDashboardKpis(withCancelled);
    expect(k.billed).toBe("5400.00");
    expect(k.shootsInPeriod).toBe(4);
  });
});

describe("shootsNeedingPayment", () => {
  const shoots = [
    { id: "s1", agreedPrice: "1000.00", status: "reserva" },
    { id: "s2", agreedPrice: "1000.00", status: "edicao" },
    { id: "s3", agreedPrice: "1000.00", status: "entregue" },
    { id: "s4", agreedPrice: "1000.00", status: "cancelado" },
  ];

  it("lists a shoot with a partial confirmed payment", () => {
    expect(
      shootsNeedingPayment(shoots, [{ shootId: "s1", amount: "400.00", status: "confirmado" }]),
    ).toContain("s1");
  });

  it("does not list a fully paid shoot", () => {
    expect(
      shootsNeedingPayment(shoots, [{ shootId: "s2", amount: "1000.00", status: "confirmado" }]),
    ).not.toContain("s2");
  });

  it("does not list an overpaid shoot (negative balance)", () => {
    expect(
      shootsNeedingPayment(shoots, [{ shootId: "s3", amount: "1200.00", status: "confirmado" }]),
    ).not.toContain("s3");
  });

  it("never lists a cancelado shoot, however unpaid", () => {
    expect(shootsNeedingPayment(shoots, [])).not.toContain("s4");
  });

  it("lists an untouched shoot with no payments at all", () => {
    expect(shootsNeedingPayment(shoots, [])).toEqual(["s1", "s2", "s3"]);
  });

  it("ignores pendente and estornado rows — only confirmed money counts", () => {
    const ids = shootsNeedingPayment(shoots, [
      { shootId: "s1", amount: "1000.00", status: "pendente" },
      { shootId: "s2", amount: "1000.00", status: "estornado" },
    ]);
    expect(ids).toContain("s1");
    expect(ids).toContain("s2");
  });
});
