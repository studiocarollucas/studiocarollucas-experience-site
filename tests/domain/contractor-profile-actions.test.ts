// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  upsertActiveContractorProfile: vi.fn(),
  recordAuditEvent: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/contractor-profile/service", () => ({
  upsertActiveContractorProfile: mocks.upsertActiveContractorProfile,
}));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { saveContractorProfileAction } from "@/domain/contractor-profile/actions";

const input = {
  personType: "company",
  legalName: "Carol Lucas Fotografia LTDA",
  document: "04.252.011/0001-10",
  address: "Rua das Flores, 10",
};
const persisted = {
  id: "00000000-0000-4000-8000-000000000123",
  scope: "active",
  personType: "company",
  legalName: "Carol Lucas Fotografia LTDA",
  document: "04252011000110",
  address: "Rua das Flores, 10",
};

describe("saveContractorProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsertActiveContractorProfile.mockResolvedValue(persisted);
  });

  it.each(["staff", "admin"] as const)("allows a %s to save the active profile", async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000456", role });

    await expect(saveContractorProfileAction(input)).resolves.toEqual({
      ok: true,
      data: { id: persisted.id },
    });
    expect(mocks.upsertActiveContractorProfile).toHaveBeenCalledWith({
      ...input,
      document: "04252011000110",
    });
  });

  it("denies a client before persisting", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000456", role: "client" });

    const result = await saveContractorProfileAction(input);
    expect(result.ok).toBe(false);
    expect(mocks.upsertActiveContractorProfile).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("records only the profile type and changed field names", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000456", role: "staff" });

    await saveContractorProfileAction(input);

    expect(mocks.recordAuditEvent).toHaveBeenCalledWith({
      actorUserId: "00000000-0000-4000-8000-000000000456",
      action: "contractor_profile.updated",
      entityType: "contractor_profile",
      entityId: persisted.id,
      before: null,
      after: {
        personType: "company",
        changedFields: ["personType", "legalName", "document", "address"],
      },
    });
    const auditPayload = JSON.stringify(mocks.recordAuditEvent.mock.calls[0][0]);
    expect(auditPayload).not.toContain(persisted.document);
    expect(auditPayload).not.toContain(persisted.address);
  });
});
