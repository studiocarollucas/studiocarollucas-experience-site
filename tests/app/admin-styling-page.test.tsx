import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getShootDetail: vi.fn(),
  listContractsForShoot: vi.fn(),
  getCurrentUser: vi.fn(),
  hasMinimumRole: vi.fn(),
  readStylingReferences: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

const serverClient = { auth: { getUser: mocks.authGetUser }, source: "cookie-jwt" };

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: vi.fn(() => ({ source: "browser" })),
}));
vi.mock("@/domain/shoots/queries", () => ({ getShootDetail: mocks.getShootDetail }));
vi.mock("@/domain/contracts/queries", () => ({
  listContractsForShoot: mocks.listContractsForShoot,
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/auth/rbac", () => ({ hasMinimumRole: mocks.hasMinimumRole }));
vi.mock("@/domain/styling/read", () => ({
  readStylingReferences: mocks.readStylingReferences,
}));

import ShootDetailPage from "@/app/admin/(protected)/agenda/[id]/page";

const shootDetail = {
  shoot: {
    id: "shoot-1",
    shootDate: "2026-09-18",
    startTime: "15:00:00",
    status: "preparacao",
    paymentStatus: "pendente",
    occasion: null,
    participantCount: null,
    referral: null,
    portalEnabled: true,
    notes: null,
    agreedPrice: "1000.00",
    locationName: null,
    locationAddress: null,
    clientGuidance: null,
  },
  clientName: "Mariana",
  clientId: "client-1",
  packageName: "Aurora",
  payments: [],
  balance: "1000.00",
  productionJob: null,
  preparationTasks: [],
};

describe("ShootDetailPage styling management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue(serverClient);
    mocks.getCurrentUser.mockResolvedValue({
      id: "staff-auth-1",
      email: "staff@example.com",
      role: "staff",
    });
    mocks.hasMinimumRole.mockReturnValue(true);
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "staff-auth-1" } },
      error: null,
    });
    mocks.getShootDetail.mockResolvedValue(shootDetail);
    mocks.listContractsForShoot.mockResolvedValue([]);
    mocks.readStylingReferences.mockResolvedValue([]);
  });

  it("passes one cookie-bound Supabase client through auth and staff signed reads", async () => {
    render(await ShootDetailPage({ params: Promise.resolve({ id: "shoot-1" }) }));

    expect(screen.getByRole("heading", { name: "Styling e referências" })).toBeInTheDocument();
    expect(screen.getByText(/seu olhar começa aqui/i)).toBeInTheDocument();
    expect(mocks.createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(mocks.getCurrentUser).toHaveBeenCalledWith(serverClient);
    expect(mocks.authGetUser).not.toHaveBeenCalled();
    expect(mocks.readStylingReferences).toHaveBeenCalledWith(serverClient, "shoot-1");
  });

  it("fails closed before data reads when the cookie session has no user", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    await expect(ShootDetailPage({ params: Promise.resolve({ id: "shoot-1" }) })).rejects.toThrow(
      "REDIRECT:/admin/login"
    );

    expect(mocks.getShootDetail).not.toHaveBeenCalled();
    expect(mocks.readStylingReferences).not.toHaveBeenCalled();
    expect(mocks.createSupabaseServerClient).toHaveBeenCalledOnce();
  });

  it("checks the local staff role before every privileged detail read", async () => {
    mocks.hasMinimumRole.mockReturnValueOnce(false);

    await expect(ShootDetailPage({ params: Promise.resolve({ id: "shoot-1" }) })).rejects.toThrow(
      "REDIRECT:/admin/login?error=Sua%20conta%20n%C3%A3o%20tem%20permiss%C3%A3o%20de%20acesso%20ao%20Studio%20OS."
    );

    expect(mocks.hasMinimumRole).toHaveBeenCalledWith("staff", "staff");
    expect(mocks.getShootDetail).not.toHaveBeenCalled();
    expect(mocks.readStylingReferences).not.toHaveBeenCalled();
    expect(mocks.createSupabaseServerClient).toHaveBeenCalledOnce();
  });
});
