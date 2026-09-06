import { describe, it, expect } from "vitest";
import { groupJobsByStatus, type ProductionCard } from "@/domain/production/queries";

const card = (id: string, status: string): ProductionCard => ({
  jobId: id,
  shootId: `s-${id}`,
  clientName: "Cliente",
  packageName: "Aurora",
  shootDate: "2026-10-01",
  status,
  editorName: null,
  deliveryDueAt: null,
  photosToEdit: null,
});

describe("groupJobsByStatus", () => {
  it("returns all five columns in canonical order even when empty", () => {
    const board = groupJobsByStatus([]);
    expect(board.map((c) => c.column)).toEqual(["aguardando", "iniciado", "parcial", "finalizado", "entregue"]);
    expect(board.every((c) => c.cards.length === 0)).toBe(true);
  });

  it("places each job in its status column", () => {
    const board = groupJobsByStatus([card("1", "aguardando"), card("2", "finalizado"), card("3", "finalizado")]);
    expect(board.find((c) => c.column === "aguardando")?.cards).toHaveLength(1);
    expect(board.find((c) => c.column === "finalizado")?.cards).toHaveLength(2);
  });

  it("ignores a card with an unknown status rather than throwing", () => {
    const board = groupJobsByStatus([card("1", "bogus")]);
    expect(board.reduce((n, c) => n + c.cards.length, 0)).toBe(0);
  });
});
