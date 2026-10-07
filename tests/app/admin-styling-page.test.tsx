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
  readStylingInventoryLinks: vi.fn(),
  getShootReviewPanel: vi.fn(),
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
vi.mock("@/domain/styling/inventory-links", () => ({
  readStylingInventoryLinks: mocks.readStylingInventoryLinks,
  linkStylingReferenceToInventoryItem: vi.fn(),
  StylingInventoryLinkError: class StylingInventoryLinkError extends Error {},
}));
vi.mock("@/domain/reviews/queries", () => ({ getShootReviewPanel: mocks.getShootReviewPanel }));

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
    mocks.readStylingInventoryLinks.mockImplementation(async (_shootId, references) => references);
    mocks.getShootReviewPanel.mockResolvedValue({ review: null, linkOpenedAt: null });
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

  it("offers only active shoot pieces for linking an authorized reference", async () => {
    mocks.readStylingReferences.mockResolvedValueOnce([{
      id: "ref-1", shootId: "shoot-1", caption: "Luz suave", origin: "client",
      signedUrl: "https://private.test/one", storagePath: "private/one", createdAt: "2026-10-07", uploadedByAuthUserId: "client-1",
    }]);
    mocks.getShootDetail.mockResolvedValueOnce({ ...shootDetail, inventoryReservations: [
      { id: "r1", inventoryItemId: "i1", itemName: "Vestido rosé", status: "confirmed", purpose: "shoot" },
      { id: "r2", inventoryItemId: "i2", itemName: "Peça cancelada", status: "cancelled", purpose: "shoot" },
      { id: "r3", inventoryItemId: "i3", itemName: "Aluguel avulso", status: "confirmed", purpose: "rental" },
    ] });
    render(await ShootDetailPage({ params: Promise.resolve({ id: "shoot-1" }) }));
    expect(screen.getByRole("combobox", { name: /Peça ligada a Luz suave/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Vestido rosé/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /cancelada|avulso/ })).not.toBeInTheDocument();
    expect(mocks.readStylingInventoryLinks).toHaveBeenCalledWith("shoot-1", expect.arrayContaining([expect.objectContaining({ id: "ref-1" })]));
  });

  it("preserves the board and warns when inventory links cannot be read", async () => {
    mocks.readStylingInventoryLinks.mockRejectedValueOnce(new Error("database unavailable"));
    render(await ShootDetailPage({ params: Promise.resolve({ id: "shoot-1" }) }));
    expect(screen.getByText(/Não foi possível carregar os vínculos/)).toBeInTheDocument();
    expect(screen.getByText(/seu olhar começa aqui/i)).toBeInTheDocument();
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
