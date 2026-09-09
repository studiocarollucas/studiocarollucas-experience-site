// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { select: mocks.select, transaction: mocks.transaction } }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import { createConfirmedShootFromLead } from "@/domain/leads/converted-shoot";

const leadId = "00000000-0000-4000-8000-000000000001";
const actorUserId = "00000000-0000-4000-8000-000000000002";
const clientId = "00000000-0000-4000-8000-000000000003";
const shoot = {
  experiencePackageId: "00000000-0000-4000-8000-000000000004",
  shootDate: "2026-12-01",
  agreedPrice: "1200.00",
};

function mockConversion(clientId: string) {
  const limit = vi.fn().mockResolvedValue([{ leadId, clientId }]);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mocks.select.mockReturnValue({ from });
}

function mockConfirmedShootTransaction(persisted: { shoots: string[]; jobs: string[]; tasks: string[][] }) {
  const staged = { shoots: [] as string[], jobs: [] as string[], tasks: [] as string[][] };
  const confirmedShoot = { id: "00000000-0000-4000-8000-000000000005", clientId };
  const shootValues = vi.fn().mockReturnValue({
    returning: vi.fn().mockImplementation(async () => {
      staged.shoots.push(confirmedShoot.id);
      return [confirmedShoot];
    }),
  });
  const jobValues = vi.fn().mockReturnValue({
    returning: vi.fn().mockImplementation(async () => {
      staged.jobs.push(confirmedShoot.id);
      return [{ shootId: confirmedShoot.id, status: "aguardando" }];
    }),
  });
  const taskValues = vi.fn().mockImplementation((tasks) => {
    staged.tasks.push(tasks.map((task: { type: string }) => task.type));
  });
  const tx = {
    insert: vi.fn().mockReturnValueOnce({ values: shootValues }).mockReturnValueOnce({ values: jobValues }).mockReturnValueOnce({ values: taskValues }),
  };

  mocks.transaction.mockImplementation(async (operation) => {
    try {
      const result = await operation(tx);
      persisted.shoots.push(...staged.shoots);
      persisted.jobs.push(...staged.jobs);
      persisted.tasks.push(...staged.tasks);
      return result;
    } catch (error) {
      throw error;
    }
  });

  return { confirmedShoot, tx };
}

describe("createConfirmedShootFromLead", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects a Lead without a conversion", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    mocks.select.mockReturnValue({ from });

    await expect(createConfirmedShootFromLead({ leadId, actorUserId, shoot })).rejects.toThrow("Cliente");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("creates one confirmed reservation from the linked Client and audits it", async () => {
    const persisted = { shoots: [] as string[], jobs: [] as string[], tasks: [] as string[][] };
    mockConversion(clientId);
    const { confirmedShoot } = mockConfirmedShootTransaction(persisted);
    mocks.recordAuditEvent.mockResolvedValue({});

    await expect(createConfirmedShootFromLead({ leadId, actorUserId, shoot })).resolves.toMatchObject({
      shoot: { clientId },
    });
    expect(persisted).toEqual({
      shoots: [confirmedShoot.id],
      jobs: [confirmedShoot.id],
      tasks: [["moodboard", "figurino", "clutch", "make", "confirmacao_horario", "pagamento"]],
    });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      {
        actorUserId,
        action: "lead.shoot_created",
        entityType: "lead",
        entityId: leadId,
        after: { shootId: confirmedShoot.id },
      },
      expect.anything(),
    );
  });

  it("rolls back the confirmed Shoot lifecycle when its audit write fails", async () => {
    const persisted = { shoots: [] as string[], jobs: [] as string[], tasks: [] as string[][] };
    mockConversion(clientId);
    mockConfirmedShootTransaction(persisted);
    mocks.recordAuditEvent.mockRejectedValue(new Error("audit write failed"));

    await expect(createConfirmedShootFromLead({ leadId, actorUserId, shoot })).rejects.toThrow("audit write failed");
    expect(persisted).toEqual({ shoots: [], jobs: [], tasks: [] });
  });
});
