import { describe, it, expect } from "vitest";
import { summarizeClientHistory } from "@/domain/clients/queries";

describe("summarizeClientHistory", () => {
  const shoots = [
    { id: "s1", packageName: "Aurora", shootDate: "2026-03-01", status: "entregue", agreedPrice: "2000.00" },
    { id: "s2", packageName: "Bella", shootDate: "2026-09-01", status: "reserva", agreedPrice: "1500.00" },
  ];
  const payments = [
    { shootId: "s1", amount: "2000.00", status: "confirmado" as const },
    { shootId: "s2", amount: "500.00", status: "confirmado" as const },
    { shootId: "s2", amount: "300.00", status: "pendente" as const },
  ];

  it("computes per-shoot confirmed paid and balance from calculateBalance", () => {
    const { rows } = summarizeClientHistory(shoots, payments);
    expect(rows.find((r) => r.id === "s1")).toMatchObject({ confirmedPaid: "2000.00", balance: "0.00" });
    expect(rows.find((r) => r.id === "s2")).toMatchObject({ confirmedPaid: "500.00", balance: "1000.00" });
  });

  it("lifetime revenue is the sum of confirmed payments across all shoots", () => {
    expect(summarizeClientHistory(shoots, payments).lifetimeRevenue).toBe("2500.00");
  });

  it("open balance sums only positive per-shoot balances", () => {
    expect(summarizeClientHistory(shoots, payments).openBalance).toBe("1000.00");
  });

  it("open balance skips cancelado shoots — a cancelled shoot is not money owed", () => {
    const withCancelled = [
      ...shoots,
      { id: "s3", packageName: "Ciara", shootDate: "2026-10-01", status: "cancelado", agreedPrice: "800.00" },
    ];
    const summary = summarizeClientHistory(withCancelled, payments);
    expect(summary.openBalance).toBe("1000.00");
    // the row is still listed with its real balance — only the aggregate skips it
    expect(summary.rows.find((r) => r.id === "s3")?.balance).toBe("800.00");
  });

  it("handles a client with no shoots", () => {
    expect(summarizeClientHistory([], [])).toEqual({ rows: [], lifetimeRevenue: "0.00", openBalance: "0.00" });
  });
});
