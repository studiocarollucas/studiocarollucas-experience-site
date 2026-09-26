import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getLeadDetail: vi.fn(),
  transitionLeadStatus: vi.fn(),
  findLeadClientCandidates: vi.fn(),
  convertWonLead: vi.fn(),
  listActivePackages: vi.fn(),
  getLeadReferralPanel: vi.fn(),
  setLeadReferral: vi.fn(),
  removeLeadReferral: vi.fn(),
  revalidatePath: vi.fn(),
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
vi.mock("@/domain/catalog/queries", () => ({ listActivePackages: mocks.listActivePackages }));
vi.mock("@/domain/referrals/queries", () => ({ getLeadReferralPanel: mocks.getLeadReferralPanel }));
vi.mock("@/domain/referrals/service", () => ({
  setLeadReferral: mocks.setLeadReferral,
  removeLeadReferral: mocks.removeLeadReferral,
}));
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
import {
  convertLeadAction,
  removeLeadReferralAction,
  setLeadReferralAction,
} from "@/app/admin/(protected)/leads/[id]/actions";
import { REFERRAL_MESSAGES, ReferralError } from "@/domain/referrals/errors";

const leadId = "00000000-0000-4000-8000-000000000501";
const actorUserId = "00000000-0000-4000-8000-000000000502";
const referrerClientId = "00000000-0000-4000-8000-000000000503";
const clientId = "00000000-0000-4000-8000-000000000504";

const lead = {
  id: leadId,
  name: "Maria",
  status: "novo",
  source: "indicacao",
  quizResult: null,
  phone: null,
  email: "maria@example.test",
  lostReason: null,
  owner: null,
  clientId: null,
  occasion: null,
  createdAt: new Date("2026-09-20T12:00:00.000Z"),
  audit: [],
};

describe("Lead referral in the Admin (SCL-722)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: actorUserId, role: "staff" });
    mocks.listActivePackages.mockResolvedValue([]);
    mocks.getLeadReferralPanel.mockResolvedValue({
      referral: null,
      referrerOptions: [{ id: referrerClientId, name: "Ana Indicadora" }],
    });
  });

  it("records the referrer chosen on the Lead with the session user as actor", async () => {
    mocks.setLeadReferral.mockResolvedValue({ referral: { id: "referral-1" }, changed: true });

    await expect(setLeadReferralAction({ leadId, referrerClientId, actorUserId: "forged" })).resolves.toEqual({
      ok: true,
      data: { leadId },
    });
    expect(mocks.setLeadReferral).toHaveBeenCalledWith({ leadId, referrerClientId, actorUserId });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/leads/${leadId}`);
  });

  it("requires a staff session and a selected referrer", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "client-user", role: "client" });
    await expect(setLeadReferralAction({ leadId, referrerClientId })).resolves.toMatchObject({ ok: false });
    await expect(removeLeadReferralAction({ leadId })).resolves.toMatchObject({ ok: false });

    mocks.getCurrentUser.mockResolvedValue({ id: actorUserId, role: "staff" });
    await expect(setLeadReferralAction({ leadId })).resolves.toMatchObject({
      ok: false,
      fieldErrors: { referrerClientId: ["Selecione a cliente que indicou."] },
    });
    expect(mocks.setLeadReferral).not.toHaveBeenCalled();
    expect(mocks.removeLeadReferral).not.toHaveBeenCalled();
  });

  it("shows referral rule violations as actionable messages", async () => {
    mocks.setLeadReferral.mockRejectedValue(new ReferralError(REFERRAL_MESSAGES.self));
    await expect(setLeadReferralAction({ leadId, referrerClientId })).resolves.toEqual({
      ok: false,
      error: REFERRAL_MESSAGES.self,
      fieldErrors: { referrerClientId: [REFERRAL_MESSAGES.self] },
    });

    mocks.removeLeadReferral.mockRejectedValue(new ReferralError(REFERRAL_MESSAGES.convertedLocked));
    await expect(removeLeadReferralAction({ leadId })).resolves.toEqual({
      ok: false,
      error: REFERRAL_MESSAGES.convertedLocked,
    });
  });

  it("keeps the conversion error actionable when the referral conflicts", async () => {
    mocks.convertWonLead.mockRejectedValue(new ReferralError(REFERRAL_MESSAGES.conversionSelf));

    await expect(convertLeadAction({ leadId, mode: "existing", clientId })).resolves.toEqual({
      ok: false,
      error: REFERRAL_MESSAGES.conversionSelf,
    });
  });

  it("removes an informed referral with the session user as actor", async () => {
    mocks.removeLeadReferral.mockResolvedValue({ removed: true });

    await expect(removeLeadReferralAction({ leadId })).resolves.toEqual({ ok: true, data: { leadId } });
    expect(mocks.removeLeadReferral).toHaveBeenCalledWith({ leadId, actorUserId });
  });

  it("renders the referral form on the Lead detail", async () => {
    mocks.getLeadDetail.mockResolvedValue(lead);

    render(await LeadDetailPage({ params: Promise.resolve({ id: leadId }) }));

    expect(mocks.getLeadReferralPanel).toHaveBeenCalledWith(leadId);
    expect(screen.getByRole("heading", { name: "Indicação" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Ana Indicadora" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar indicação" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Remover indicação" })).not.toBeInTheDocument();
  });

  it("shows a converted referral as read-only", async () => {
    mocks.getLeadDetail.mockResolvedValue({ ...lead, status: "ganho" });
    mocks.findLeadClientCandidates.mockResolvedValue([]);
    mocks.getLeadReferralPanel.mockResolvedValue({
      referral: {
        id: "referral-1",
        referrerClientId,
        referrerName: "Ana Indicadora",
        referredClientId: clientId,
        convertedAt: new Date("2026-09-25T12:00:00.000Z"),
        createdAt: new Date("2026-09-20T12:00:00.000Z"),
      },
      referrerOptions: [{ id: referrerClientId, name: "Ana Indicadora" }],
    });

    render(await LeadDetailPage({ params: Promise.resolve({ id: leadId }) }));

    expect(screen.getByText("Ana Indicadora")).toBeVisible();
    expect(screen.getByText("convertida")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Trocar indicação" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover indicação" })).not.toBeInTheDocument();
  });
});
