import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getLeadDetail: vi.fn(),
  transitionLeadStatus: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/leads/detail", () => ({ getLeadDetail: mocks.getLeadDetail, transitionLeadStatus: mocks.transitionLeadStatus }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import LeadDetailPage from "@/app/admin/(protected)/leads/[id]/page";
import { transitionLeadStatusAction } from "@/app/admin/(protected)/leads/[id]/actions";

describe("LeadDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-1", email: "staff@example.test", role: "staff" });
  });

  it("redirects a client before loading a Lead", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "client-1", role: "client" });

    await expect(LeadDetailPage({ params: Promise.resolve({ id: "lead-1" }) })).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.getLeadDetail).not.toHaveBeenCalled();
  });

  it("renders contact, quiz result and valid status action for staff", async () => {
    mocks.getLeadDetail.mockResolvedValue({
      id: "lead-1",
      name: "Maria",
      status: "novo",
      source: "quiz",
      quizResult: "Romântica",
      phone: null,
      email: "maria@example.test",
      lostReason: null,
      owner: null,
      createdAt: new Date(),
      audit: [],
    });

    render(await LeadDetailPage({ params: Promise.resolve({ id: "lead-1" }) }));

    expect(screen.getByText("maria@example.test")).toBeVisible();
    expect(screen.getByText("Romântica")).toBeVisible();
    expect(screen.getByRole("button", { name: /marcar como contato/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /marcar como ganho/i })).not.toBeInTheDocument();
  });

  it("parses a status form using the authenticated staff member as the audit actor", async () => {
    const leadId = "00000000-0000-4000-8000-000000000001";
    mocks.getCurrentUser.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000002", role: "staff" });
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("status", "contato");

    await expect(transitionLeadStatusAction(formData)).resolves.toEqual({ ok: true, data: { id: leadId } });
    expect(mocks.transitionLeadStatus).toHaveBeenCalledWith({ leadId, status: "contato", actorUserId: "00000000-0000-4000-8000-000000000002" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/leads");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/leads/${leadId}`);
  });
});
