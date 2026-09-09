// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  createConfirmedShoot: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { select: mocks.select } }));
vi.mock("@/domain/shoots/create-confirmed-shoot", () => ({ createConfirmedShoot: mocks.createConfirmedShoot }));
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
    expect(mocks.createConfirmedShoot).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("creates one confirmed reservation from the linked Client and audits it", async () => {
    const conversion = { leadId, clientId };
    const limit = vi.fn().mockResolvedValue([conversion]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const confirmedShoot = { id: "00000000-0000-4000-8000-000000000005", clientId };
    mocks.select.mockReturnValue({ from });
    mocks.createConfirmedShoot.mockResolvedValue({ shoot: confirmedShoot });
    mocks.recordAuditEvent.mockResolvedValue({});

    await expect(createConfirmedShootFromLead({ leadId, actorUserId, shoot })).resolves.toMatchObject({
      shoot: { clientId },
    });
    expect(mocks.createConfirmedShoot).toHaveBeenCalledWith({ ...shoot, clientId });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith({
      actorUserId,
      action: "lead.shoot_created",
      entityType: "lead",
      entityId: leadId,
      after: { shootId: confirmedShoot.id },
    });
  });
});
