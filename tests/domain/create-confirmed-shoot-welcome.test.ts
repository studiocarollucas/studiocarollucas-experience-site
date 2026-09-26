// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  enqueueShootWelcome: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("@/domain/automation/flows/shoot-welcome", () => ({ enqueueShootWelcome: mocks.enqueueShootWelcome }));

import { createConfirmedShoot } from "@/domain/shoots/create-confirmed-shoot";

const confirmedShoot = {
  id: "00000000-0000-4000-8000-00000000e101",
  clientId: "00000000-0000-4000-8000-00000000e102",
  shootDate: "2026-12-01",
  status: "reserva",
  portalEnabled: true,
};

function mockTransaction(committed: string[]) {
  const staged: string[] = [];
  const tx = {
    insert: vi
      .fn()
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockImplementation(async () => {
            staged.push("shoot");
            return [confirmedShoot];
          }),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockImplementation(async () => {
            staged.push("job");
            return [{ shootId: confirmedShoot.id, status: "aguardando" }];
          }),
        }),
      })
      .mockReturnValueOnce({ values: vi.fn().mockImplementation(async () => staged.push("tasks")) }),
  };
  mocks.transaction.mockImplementation(async (operation) => {
    const result = await operation(tx);
    committed.push(...staged);
    return result;
  });
  return tx;
}

describe("createConfirmedShoot welcome (SCL-701)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("enqueues the welcome with the created shoot inside the same transaction", async () => {
    const committed: string[] = [];
    const tx = mockTransaction(committed);
    mocks.enqueueShootWelcome.mockResolvedValue({ status: "enqueued", eventId: "event-1" });

    await createConfirmedShoot(
      {
        clientId: confirmedShoot.clientId,
        experiencePackageId: "00000000-0000-4000-8000-00000000e103",
        shootDate: confirmedShoot.shootDate,
        agreedPrice: "1200.00",
      },
      { portalEnabled: true },
    );

    expect(mocks.enqueueShootWelcome).toHaveBeenCalledOnce();
    expect(mocks.enqueueShootWelcome).toHaveBeenCalledWith(confirmedShoot, tx);
    expect(committed).toEqual(["shoot", "job", "tasks"]);
  });

  it("rolls the reservation back when the welcome cannot be enqueued", async () => {
    const committed: string[] = [];
    mockTransaction(committed);
    mocks.enqueueShootWelcome.mockRejectedValue(new Error("outbox write failed"));

    await expect(
      createConfirmedShoot({
        clientId: confirmedShoot.clientId,
        experiencePackageId: "00000000-0000-4000-8000-00000000e103",
        shootDate: confirmedShoot.shootDate,
        agreedPrice: "1200.00",
      }),
    ).rejects.toThrow("outbox write failed");
    expect(committed).toEqual([]);
  });
});
