import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getActiveContractorProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/contractor-profile/service", () => ({
  getActiveContractorProfile: mocks.getActiveContractorProfile,
}));

import ContractorProfilePage from "@/app/admin/(protected)/configuracoes/contratante/page";

describe("ContractorProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-1", email: "staff@example.com", role: "staff" });
    mocks.getActiveContractorProfile.mockResolvedValue(null);
  });

  it.each([null, { id: "client-1", email: "client@example.com", role: "client" }])(
    "redirects non-staff users before loading the contractor profile: %j",
    async (user) => {
      mocks.getCurrentUser.mockResolvedValue(user);

      await expect(ContractorProfilePage()).rejects.toThrow("REDIRECT:/admin/login");
      expect(mocks.getActiveContractorProfile).not.toHaveBeenCalled();
    },
  );

  it("shows an empty form when no contractor profile has been saved", async () => {
    render(await ContractorProfilePage());

    expect(screen.getByRole("heading", { name: "Contratante" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome completo")).toHaveValue("");
    expect(screen.getByLabelText("CPF")).toHaveValue("");
  });
});
