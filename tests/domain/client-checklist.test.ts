import { describe, expect, it, vi } from "vitest";
import { setClientTaskStatus } from "@/domain/portal/checklist";

describe("setClientTaskStatus", () => {
  it("updates only the status column and returns the database row", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "task-1",
        status: "concluida",
        completed_at: "2026-09-06T12:00:00Z",
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ update })) };

    await expect(setClientTaskStatus(client, "task-1", "concluida")).resolves.toEqual({
      id: "task-1",
      status: "concluida",
      completedAt: "2026-09-06T12:00:00Z",
    });
    expect(client.from).toHaveBeenCalledWith("preparation_tasks");
    expect(update).toHaveBeenCalledWith({ status: "concluida" });
    expect(eq).toHaveBeenCalledWith("id", "task-1");
    expect(select).toHaveBeenCalledWith("id,status,completed_at");
  });

  it("returns a neutral failure", async () => {
    const client = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: "raw database failure" } }),
            }),
          }),
        }),
      }),
    };

    await expect(setClientTaskStatus(client, "task-1", "pendente")).rejects.toThrow(
      "Não foi possível atualizar esta tarefa.",
    );
  });
});
