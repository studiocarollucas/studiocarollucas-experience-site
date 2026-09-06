import { describe, it, expect } from "vitest";
import { summarizePreparationProgress } from "@/domain/preparation/queries";

const t = (status: string, title: string) => ({ status, title, visibleToClient: true });

describe("summarizePreparationProgress", () => {
  it("is 0% with no tasks and no next task", () => {
    expect(summarizePreparationProgress([])).toEqual({ total: 0, done: 0, pct: 0, nextTaskTitle: null });
  });

  it("counts concluida as done and rounds pct to an integer", () => {
    const p = summarizePreparationProgress([
      t("concluida", "A"),
      t("pendente", "B"),
      t("em_andamento", "C"),
    ]);
    expect(p).toMatchObject({ total: 3, done: 1, pct: 33 });
  });

  it("nextTaskTitle is the first non-concluida task in order", () => {
    const p = summarizePreparationProgress([t("concluida", "A"), t("em_andamento", "B"), t("pendente", "C")]);
    expect(p.nextTaskTitle).toBe("B");
  });

  it("is 100% and null next when every task is concluida", () => {
    const p = summarizePreparationProgress([t("concluida", "A"), t("concluida", "B")]);
    expect(p).toEqual({ total: 2, done: 2, pct: 100, nextTaskTitle: null });
  });
});
