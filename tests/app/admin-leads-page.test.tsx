import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listLeads: vi.fn(),
  listLeadOwnerOptions: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/leads/queries", () => ({
  listLeads: mocks.listLeads,
  listLeadOwnerOptions: mocks.listLeadOwnerOptions,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  usePathname: () => "/admin/leads",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import LeadListPage from "@/app/admin/(protected)/leads/page";

describe("LeadListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listLeadOwnerOptions.mockResolvedValue([]);
    mocks.listLeads.mockResolvedValue({ rows: [], total: 0, page: 1, limit: 25 });
  });

  it.each([null, { id: "client-1", email: "client@example.test", role: "client" }])(
    "blocks unauthorized users before reading leads: %j",
    async (user) => {
      mocks.getCurrentUser.mockResolvedValue(user);

      await expect(LeadListPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/admin/login");
      expect(mocks.listLeads).not.toHaveBeenCalled();
    },
  );

  it.each(["staff", "admin"])('shows the protected list to %s users', async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-1", email: "staff@example.test", role });
    mocks.listLeads.mockResolvedValue({
      rows: [
        {
          id: "lead-1",
          name: "Maria Silva",
          phone: "(92) 99999-9999",
          email: "maria@example.test",
          source: "quiz",
          occasion: "Gestante",
          quizResult: "Experiência intimista",
          status: "novo",
          ownerId: "staff-1",
          ownerName: "Carol Lucas",
          createdAt: "2026-09-08T12:00:00.000Z",
        },
      ],
      total: 26,
      page: 1,
      limit: 25,
    });

    render(await LeadListPage({ searchParams: Promise.resolve({ search: "Maria", status: "novo", source: "quiz", ownerId: "staff-1" }) }));

    expect(mocks.listLeads).toHaveBeenCalledWith({ query: "Maria", status: "novo", source: "quiz", ownerId: "staff-1", page: undefined });
    expect(screen.getByRole("link", { name: /Maria Silva/i })).toHaveAttribute("href", "/admin/leads/lead-1");
    expect(screen.getByText("Gestante")).toBeInTheDocument();
    expect(screen.getByText(/Experiência intimista/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Próxima" })).toHaveAttribute(
      "href",
      "/admin/leads?search=Maria&status=novo&source=quiz&ownerId=staff-1&page=2",
    );
  });

  it("shows an empty state for a permitted user with no matching leads", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-1", email: "staff@example.test", role: "staff" });

    render(await LeadListPage({ searchParams: Promise.resolve({ search: "ausente" }) }));

    expect(screen.getByText("Nenhum lead encontrado")).toBeInTheDocument();
  });
});
