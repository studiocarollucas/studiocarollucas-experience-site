import { describe, expect, it } from "vitest";
import { summarizePortalMoney, summarizePortalPreparation } from "@/domain/portal/summary";

describe("portal summaries", () => {
  it("returns an empty preparation summary with no tasks", () => {
    expect(summarizePortalPreparation([])).toEqual({
      total: 0,
      done: 0,
      pct: 0,
      nextTask: null,
    });
  });

  it("derives progress from visible completed tasks", () => {
    expect(
      summarizePortalPreparation([
        {
          id: "done",
          title: "Concluída",
          status: "concluida",
          clientActionable: false,
          visibleToClient: true,
          dueAt: null,
          createdAt: "2026-09-01",
        },
        {
          id: "pending-1",
          title: "Pendente 1",
          status: "pendente",
          clientActionable: true,
          visibleToClient: true,
          dueAt: "2026-09-10",
          createdAt: "2026-09-01",
        },
        {
          id: "pending-2",
          title: "Pendente 2",
          status: "em_andamento",
          clientActionable: true,
          visibleToClient: true,
          dueAt: "2026-09-11",
          createdAt: "2026-09-01",
        },
        {
          id: "hidden-done",
          title: "Interna concluída",
          status: "concluida",
          clientActionable: false,
          visibleToClient: false,
          dueAt: null,
          createdAt: "2026-09-01",
        },
      ])
    ).toMatchObject({ total: 3, done: 1, pct: 33 });
  });

  it("prioritizes actionable incomplete tasks by due date", () => {
    const tasks = [
      {
        id: "later",
        title: "Depois",
        status: "pendente",
        clientActionable: true,
        visibleToClient: true,
        dueAt: "2026-09-12",
        createdAt: "2026-09-01",
      },
      {
        id: "now",
        title: "Agora",
        status: "em_andamento",
        clientActionable: true,
        visibleToClient: true,
        dueAt: "2026-09-10",
        createdAt: "2026-09-02",
      },
      {
        id: "hidden",
        title: "Interna",
        status: "pendente",
        clientActionable: true,
        visibleToClient: false,
        dueAt: "2026-09-01",
        createdAt: "2026-09-01",
      },
    ];

    expect(summarizePortalPreparation(tasks)).toMatchObject({
      total: 2,
      done: 0,
      pct: 0,
      nextTask: { id: "now", title: "Agora", actionable: true },
    });
  });

  it("falls back to informational incomplete work", () => {
    const result = summarizePortalPreparation([
      {
        id: "info",
        title: "Aguardar confirmação",
        status: "pendente",
        clientActionable: false,
        visibleToClient: true,
        dueAt: null,
        createdAt: "2026-09-01",
      },
    ]);

    expect(result.nextTask).toEqual({ id: "info", title: "Aguardar confirmação", actionable: false });
  });

  it("derives paid total, balance, and status from confirmed rows", () => {
    expect(
      summarizePortalMoney("1000.00", [
        { amount: "250.00", status: "confirmado" },
        { amount: "100.00", status: "pendente" },
      ])
    ).toEqual({ agreed: "1000.00", paid: "250.00", balance: "750.00", status: "parcial" });
  });

  it("ignores pending and refunded rows in monetary derivation", () => {
    expect(
      summarizePortalMoney("1000.00", [
        { amount: "250.00", status: "confirmado" },
        { amount: "500.00", status: "estornado" },
        { amount: "250.00", status: "pendente" },
      ])
    ).toEqual({ agreed: "1000.00", paid: "250.00", balance: "750.00", status: "parcial" });
  });

  it("preserves a negative balance while marking an overpayment as paid", () => {
    expect(summarizePortalMoney("1000.00", [{ amount: "1100.00", status: "confirmado" }])).toEqual({
      agreed: "1000.00",
      paid: "1100.00",
      balance: "-100.00",
      status: "pago",
    });
  });
});
