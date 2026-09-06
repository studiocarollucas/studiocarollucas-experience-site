import { describe, it, expect } from "vitest";
import { buildLedger } from "@/domain/finance/ledger";

const input = {
  payments: [
    { paidAt: "2026-09-10T12:00:00Z", createdAt: "2026-09-10T12:00:00Z", amount: "800.00", status: "confirmado", clientName: "Ana" },
    { paidAt: null, createdAt: "2026-09-12T09:00:00Z", amount: "300.00", status: "pendente", clientName: "Bia" },
    { paidAt: "2026-09-05T08:00:00Z", createdAt: "2026-09-05T08:00:00Z", amount: "500.00", status: "estornado", clientName: "Cléo" },
  ],
  expenses: [
    { date: "2026-09-08", category: "Equipamento", type: "investimento", amount: "1200.00" },
    { date: "2026-09-15", category: "Aluguel", type: "custo", amount: "900.00" },
  ],
  openReceivable: "2000.00",
};

describe("buildLedger", () => {
  it("includes only confirmed receipts and all expenses", () => {
    const { entries } = buildLedger(input);
    expect(entries.filter((e) => e.kind === "recebimento")).toHaveLength(1);
    expect(entries.filter((e) => e.kind === "despesa")).toHaveLength(2);
  });

  it("sorts entries by date descending", () => {
    const { entries } = buildLedger(input);
    expect(entries.map((e) => e.date)).toEqual(["2026-09-15", "2026-09-10", "2026-09-08"]);
  });

  it("signs expense amounts negative and receipts positive", () => {
    const { entries } = buildLedger(input);
    expect(entries.find((e) => e.description.includes("Ana"))?.signedAmount).toBe("800.00");
    expect(entries.find((e) => e.description.includes("Aluguel"))?.signedAmount).toBe("-900.00");
  });

  it("summary: received, expenses, net, and passed-through receivable", () => {
    const { summary } = buildLedger(input);
    expect(summary.received).toBe("800.00");
    expect(summary.expenses).toBe("2100.00");
    expect(summary.net).toBe("-1300.00");
    expect(summary.receivable).toBe("2000.00");
  });

  it("uses createdAt when a confirmed payment has no paidAt", () => {
    const { entries } = buildLedger({
      ...input,
      payments: [
        { paidAt: null, createdAt: "2026-09-20T10:00:00Z", amount: "100.00", status: "confirmado", clientName: "Dan" },
      ],
    });
    expect(entries[0].date).toBe("2026-09-20");
  });

  it("gives every entry a unique, stable id", () => {
    const { entries } = buildLedger(input);
    expect(entries.every((e) => e.id)).toBeTruthy();
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });
});
