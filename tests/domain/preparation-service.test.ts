import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn(), update: vi.fn() } }));
vi.mock("@/db/client", () => ({ db: mocks.db }));

import { setPreparationTaskStatus } from "@/domain/preparation/service";

describe("setPreparationTaskStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates only status and leaves completed_at to the database trigger", async () => {
    const current = {
      id: "task-1",
      status: "pendente",
      completedAt: null,
    };
    const selectedLimit = vi.fn().mockResolvedValue([current]);
    const selectedWhere = vi.fn(() => ({ limit: selectedLimit }));
    const selectedFrom = vi.fn(() => ({ where: selectedWhere }));
    mocks.db.select.mockReturnValue({ from: selectedFrom });

    const updated = { ...current, status: "concluida", completedAt: "2026-09-07T12:00:00Z" };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    mocks.db.update.mockReturnValue({ set });

    await expect(setPreparationTaskStatus("task-1", "concluida")).resolves.toEqual({
      task: updated,
      previousStatus: "pendente",
    });
    expect(set).toHaveBeenCalledWith({ status: "concluida" });
  });
});
