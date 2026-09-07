import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getShootDetail: vi.fn(),
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
vi.mock("@/domain/shoots/queries", () => ({ getShootDetail: mocks.getShootDetail }));
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
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "staff-auth-1" } },
      error: null,
    });
    mocks.getShootDetail.mockResolvedValue(shootDetail);
    mocks.readStylingReferences.mockResolvedValue([]);
  });

  it("reuses one cookie-bound Supabase client for auth and staff signed reads", async () => {
    render(await ShootDetailPage({ params: Promise.resolve({ id: "shoot-1" }) }));

    expect(screen.getByRole("heading", { name: "Styling e referências" })).toBeInTheDocument();
    expect(screen.getByText(/seu olhar começa aqui/i)).toBeInTheDocument();
    expect(mocks.createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(mocks.authGetUser).toHaveBeenCalledOnce();
    expect(mocks.readStylingReferences).toHaveBeenCalledWith(serverClient, "shoot-1");
  });

  it("fails closed before data reads when the cookie session has no user", async () => {
    mocks.authGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(ShootDetailPage({ params: Promise.resolve({ id: "shoot-1" }) })).rejects.toThrow(
      "REDIRECT:/admin/login"
    );

    expect(mocks.getShootDetail).not.toHaveBeenCalled();
    expect(mocks.readStylingReferences).not.toHaveBeenCalled();
  });
});
