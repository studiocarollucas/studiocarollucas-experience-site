import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalStylingSnapshot: vi.fn(),
  readPortalInventorySelection: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: vi.fn(() => ({ source: "browser" })),
}));
vi.mock("@/domain/portal/server", () => ({
  getPortalStylingSnapshot: mocks.getPortalStylingSnapshot,
  getPortalRequestContext: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/domain/inventory/portal-selection", () => ({
  readPortalInventorySelection: mocks.readPortalInventorySelection,
  setClientInventoryPreference: vi.fn(),
  PortalInventorySelectionError: class PortalInventorySelectionError extends Error {},
}));

import ClientStylingPage from "@/app/(client)/minha-experiencia/styling/page";

const snapshotWithShoot = {
  client: { id: "client-1", name: "Mariana" },
  viewerAuthUserId: "auth-1",
  shoot: { id: "shoot-1" },
  experience: null,
  tasks: [],
  payments: [],
  references: [],
};

describe("ClientStylingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readPortalInventorySelection.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("uses one cookie-bound portal snapshot for the selected shoot board", async () => {
    mocks.getPortalStylingSnapshot.mockResolvedValueOnce({
      client: { id: "client-1", name: "Mariana" },
      viewerAuthUserId: "auth-1",
      shoot: { id: "shoot-1" },
      experience: null,
      tasks: [],
      payments: [],
      references: [],
    });

    render(await ClientStylingPage());

    expect(screen.getByRole("heading", { name: "Styling e referências" })).toBeInTheDocument();
    expect(screen.getByText(/seu olhar começa aqui/i)).toBeInTheDocument();
    expect(mocks.getPortalStylingSnapshot).toHaveBeenCalledOnce();
  });

  it("guides the client when no eligible shoot exists", async () => {
    mocks.getPortalStylingSnapshot.mockResolvedValueOnce({
      client: { id: "client-1", name: "Mariana" },
      viewerAuthUserId: "auth-1",
      shoot: null,
      experience: null,
      tasks: [],
      payments: [],
      references: [],
    });

    render(await ClientStylingPage());

    expect(screen.getByText(/aparecerá quando o ensaio for liberado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/escolher imagem/i)).not.toBeInTheDocument();
  });

  it("shows real inventory pieces apart from the inspiration moodboard", async () => {
    mocks.getPortalStylingSnapshot.mockResolvedValueOnce(snapshotWithShoot);
    mocks.readPortalInventorySelection.mockResolvedValueOnce({
      selectionOpen: true,
      limits: { outfit: 2, clutch: 1 },
      used: { outfit: 1, clutch: 0 },
      shootItems: [
        { id: "item-1", name: "Vestido rosé", type: "outfit", color: null, size: "M", photos: [], availability: "preferred" },
      ],
      catalog: [
        { id: "item-2", name: "Clutch dourada", type: "clutch", color: "dourado", size: null, photos: [], availability: "unavailable" },
      ],
    });

    render(await ClientStylingPage());

    expect(mocks.readPortalInventorySelection).toHaveBeenCalledWith(snapshotWithShoot);
    expect(screen.getByRole("heading", { name: "Peças do acervo" })).toBeInTheDocument();
    expect(screen.getByText(/aguardando confirmação do estúdio/i)).toBeInTheDocument();
    expect(screen.getByText("Indisponível na data do seu ensaio")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Moodboard" })).toBeInTheDocument();
    expect(screen.getByText("Inspiração · não é reserva")).toBeInTheDocument();
  });

  it("keeps the moodboard when the inventory cannot be loaded", async () => {
    mocks.getPortalStylingSnapshot.mockResolvedValueOnce(snapshotWithShoot);
    mocks.readPortalInventorySelection.mockRejectedValueOnce(new Error("storage down"));

    render(await ClientStylingPage());

    expect(screen.getByText(/Não foi possível carregar as peças do acervo/)).toBeInTheDocument();
    expect(screen.getByText(/seu olhar começa aqui/i)).toBeInTheDocument();
  });
});
