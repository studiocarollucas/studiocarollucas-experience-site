import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getLeadDetail: vi.fn(),
  findLeadClientCandidates: vi.fn(),
  convertWonLead: vi.fn(),
  transitionLeadStatus: vi.fn(),
  revalidatePath: vi.fn(),
  createShootAction: vi.fn(),
  createConfirmedShootFromLead: vi.fn(),
  listActivePackages: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/leads/detail", () => ({
  getLeadDetail: mocks.getLeadDetail,
  transitionLeadStatus: mocks.transitionLeadStatus,
}));
vi.mock("@/domain/leads/conversion", () => ({
  findLeadClientCandidates: mocks.findLeadClientCandidates,
  convertWonLead: mocks.convertWonLead,
}));
vi.mock("@/domain/shoots/actions", () => ({ createShootAction: mocks.createShootAction }));
vi.mock("@/domain/leads/converted-shoot", () => ({ createConfirmedShootFromLead: mocks.createConfirmedShootFromLead }));
vi.mock("@/domain/catalog/queries", () => ({ listActivePackages: mocks.listActivePackages }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn() }),
}));

import LeadDetailPage from "@/app/admin/(protected)/leads/[id]/page";
import { convertLeadAction, createLeadShootAction } from "@/app/admin/(protected)/leads/[id]/actions";

const leadId = "00000000-0000-4000-8000-000000000001";
const actorUserId = "00000000-0000-4000-8000-000000000002";
const clientId = "00000000-0000-4000-8000-000000000003";

describe("protected Lead conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: actorUserId, role: "staff" });
    mocks.listActivePackages.mockResolvedValue([]);
  });

  it("blocks a client user before candidate lookup", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "client-1", role: "client" });

    await expect(LeadDetailPage({ params: Promise.resolve({ id: leadId }) })).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.findLeadClientCandidates).not.toHaveBeenCalled();
  });

  it("passes the authenticated actor and selected existing Client to conversion", async () => {
    mocks.convertWonLead.mockResolvedValue({ client: { id: clientId } });

    await expect(convertLeadAction({ leadId, mode: "existing", clientId })).resolves.toEqual({ ok: true, data: { clientId } });
    expect(mocks.convertWonLead).toHaveBeenCalledWith({
      leadId,
      actorUserId,
      client: { mode: "existing", clientId },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/leads/${leadId}`);
  });

  it("renders candidate choices and an explicit new-client confirmation only for won Leads", async () => {
    mocks.getLeadDetail.mockResolvedValue({
      id: leadId,
      name: "Maria",
      status: "ganho",
      source: "quiz",
      quizResult: null,
      phone: null,
      email: "maria@example.test",
      lostReason: null,
      owner: null,
      createdAt: new Date(),
      audit: [],
    });
    mocks.findLeadClientCandidates.mockResolvedValue([{ id: clientId, name: "Maria existente", email: null, phone: null }]);

    render(await LeadDetailPage({ params: Promise.resolve({ id: leadId }) }));

    expect(mocks.findLeadClientCandidates).toHaveBeenCalledWith(leadId);
    expect(screen.getByRole("button", { name: "Usar Maria existente" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Criar novo cliente" })).toBeVisible();
  });

  it("derives the shoot Client from the Lead conversion when clientId is tampered", async () => {
    const packageId = "00000000-0000-4000-8000-000000000004";
    const tamperedClientId = "00000000-0000-4000-8000-000000000005";
    mocks.createConfirmedShootFromLead.mockResolvedValue({ shoot: { id: "shoot-1" } });

    await expect(createLeadShootAction({
      leadId,
      clientId: tamperedClientId,
      experiencePackageId: packageId,
      shootDate: "2026-09-30",
      agreedPrice: "1200.00",
      portalEnabled: true,
    })).resolves.toEqual({ ok: true, data: { id: "shoot-1" } });

    expect(mocks.createConfirmedShootFromLead).toHaveBeenCalledWith({
      leadId,
      actorUserId,
      shoot: {
        experiencePackageId: packageId,
        shootDate: "2026-09-30",
        agreedPrice: "1200.00",
        portalEnabled: true,
        status: "reserva",
      },
    });
    expect(mocks.createConfirmedShootFromLead.mock.calls[0][0].shoot).not.toHaveProperty("clientId");
  });
});
