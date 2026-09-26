import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalRequestContext: vi.fn(),
  readClientGallery: vi.fn(),
  listClientSelectedAssetIds: vi.fn(),
  setPhotoSelectionAction: vi.fn(),
  getPortalReviewPrompt: vi.fn(),
  listClientGalleryOffers: vi.fn(),
  listClientUpsellOrders: vi.fn(),
  newUpsellRequestKey: vi.fn(),
  requestUpsellOrderAction: vi.fn(),
}));

vi.mock("@/domain/portal/server", () => ({ getPortalRequestContext: mocks.getPortalRequestContext }));
vi.mock("@/domain/gallery/portal", () => ({ readClientGallery: mocks.readClientGallery }));
vi.mock("@/domain/gallery/selections", () => ({ listClientSelectedAssetIds: mocks.listClientSelectedAssetIds }));
vi.mock("@/app/(client)/minha-experiencia/galeria/actions", () => ({
  setPhotoSelectionAction: mocks.setPhotoSelectionAction,
}));
vi.mock("@/domain/upsell/portal", () => ({
  listClientGalleryOffers: mocks.listClientGalleryOffers,
  listClientUpsellOrders: mocks.listClientUpsellOrders,
  newUpsellRequestKey: mocks.newUpsellRequestKey,
}));
vi.mock("@/app/(client)/minha-experiencia/galeria/upsell-actions", () => ({
  requestUpsellOrderAction: mocks.requestUpsellOrderAction,
}));

vi.mock("@/domain/reviews/portal-server", () => ({ getPortalReviewPrompt: mocks.getPortalReviewPrompt }));
vi.mock("@/app/(client)/minha-experiencia/avaliacao/actions", () => ({
  openReviewLinkAction: vi.fn(),
  dismissReviewPromptAction: vi.fn(),
}));

import ClientGalleryPage from "@/app/(client)/minha-experiencia/galeria/page";

const context = { client: { id: "client-1", name: "Mariana" }, viewerAuthUserId: "auth-1", shoot: null };
const storagePath = "gallery-assets/gallery-1/asset-1.jpg";

describe("ClientGalleryPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.getPortalReviewPrompt.mockResolvedValue(null);
    mocks.listClientGalleryOffers.mockResolvedValue({ offers: [], includedPhotos: 20 });
    mocks.listClientUpsellOrders.mockResolvedValue([]);
    mocks.newUpsellRequestKey.mockReturnValue("00000000-0000-4000-8000-000000000b01");
  });

  it("renders the favorites of the signed-in client without leaking storage paths", async () => {
    mocks.readClientGallery.mockResolvedValue({
      id: "gallery-1",
      status: "published",
      downloadsEnabled: true,
      assets: [
        { id: "asset-1", storagePath, signedUrl: "https://private.example.test/asset-1?signed=1" },
        { id: "asset-2", storagePath: "gallery-assets/gallery-1/asset-2.jpg", signedUrl: "https://private.example.test/asset-2?signed=1" },
      ],
    });
    mocks.listClientSelectedAssetIds.mockResolvedValue(["asset-2"]);

    const { container } = render(await ClientGalleryPage());

    expect(mocks.listClientSelectedAssetIds).toHaveBeenCalledWith("client-1", "gallery-1");
    expect(screen.getByRole("button", { name: "Favoritar foto 1" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Favoritar foto 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("1 foto favorita")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Baixar foto 1" })).toHaveAttribute(
      "href",
      "/minha-experiencia/galeria/fotos/asset-1/download",
    );
    expect(container.innerHTML).not.toContain(storagePath);
  });

  it("hides download links when the studio has not allowed downloads", async () => {
    mocks.readClientGallery.mockResolvedValue({
      id: "gallery-1",
      status: "published",
      downloadsEnabled: false,
      assets: [{ id: "asset-1", storagePath, signedUrl: "https://private.example.test/asset-1?signed=1" }],
    });
    mocks.listClientSelectedAssetIds.mockResolvedValue([]);

    render(await ClientGalleryPage());

    expect(screen.queryByRole("link", { name: /Baixar foto/ })).not.toBeInTheDocument();
    expect(screen.getByText(/download das fotos ainda não foi liberado/i)).toBeInTheDocument();
  });

  it("does not read selections when there is no published gallery", async () => {
    mocks.readClientGallery.mockResolvedValue(null);

    render(await ClientGalleryPage());

    expect(screen.getByText(/ficará disponível quando for publicada pelo estúdio/i)).toBeInTheDocument();
    expect(mocks.listClientSelectedAssetIds).not.toHaveBeenCalled();
    expect(mocks.listClientGalleryOffers).not.toHaveBeenCalled();
    expect(mocks.listClientUpsellOrders).not.toHaveBeenCalled();
  });

  it("offers the gallery's products with the extra favorites suggestion and lists her orders (SCL-506/507)", async () => {
    mocks.readClientGallery.mockResolvedValue({
      id: "gallery-1",
      status: "published",
      downloadsEnabled: false,
      assets: [{ id: "asset-1", storagePath, signedUrl: "https://private.example.test/asset-1?signed=1" }],
    });
    mocks.listClientSelectedAssetIds.mockResolvedValue(["asset-1", "asset-2", "asset-3"]);
    mocks.listClientGalleryOffers.mockResolvedValue({
      offers: [
        {
          productId: "00000000-0000-4000-8000-000000000b02",
          kind: "foto_adicional",
          name: "Foto adicional",
          description: "Tratamento completo",
          price: "35.00",
        },
      ],
      includedPhotos: 1,
    });
    mocks.listClientUpsellOrders.mockResolvedValue([
      {
        id: "order-1",
        status: "confirmado",
        total: "890.00",
        createdAt: "2026-09-26T12:00:00.000Z",
        items: [{ name: "Álbum 20x30", kind: "album", quantity: 1, lineTotal: "890.00" }],
      },
    ]);

    render(await ClientGalleryPage());

    expect(mocks.listClientGalleryOffers).toHaveBeenCalledWith("client-1", "gallery-1");
    expect(mocks.listClientUpsellOrders).toHaveBeenCalledWith("client-1", "gallery-1");
    expect(screen.getByRole("heading", { name: "Produtos e extras" })).toBeInTheDocument();
    expect(screen.getByText(/Você favoritou 3 fotos — 2 além das incluídas no seu pacote/)).toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade de Foto adicional")).toHaveValue(2);
    expect(screen.getByRole("heading", { name: "Seus pedidos" })).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.getByText("1 × Álbum 20x30")).toBeInTheDocument();
  });

  it("shows the review card below the photos without gating favorites or downloads (SCL-721)", async () => {
    mocks.readClientGallery.mockResolvedValue({
      id: "gallery-1",
      status: "published",
      downloadsEnabled: true,
      assets: [{ id: "asset-1", storagePath, signedUrl: "https://private.example.test/asset-1?signed=1" }],
    });
    mocks.listClientSelectedAssetIds.mockResolvedValue([]);
    mocks.getPortalReviewPrompt.mockResolvedValue({
      shootId: "shoot-1",
      reviewUrl: "https://g.page/r/studio-carol-lucas/review",
    });

    render(await ClientGalleryPage());

    expect(screen.getByRole("button", { name: "Favoritar foto 1" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Baixar foto 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Avaliar no Google/ })).toBeInTheDocument();
  });

  it("does not look for the review card without a published gallery", async () => {
    mocks.readClientGallery.mockResolvedValue(null);

    render(await ClientGalleryPage());

    expect(mocks.getPortalReviewPrompt).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /Avaliar no Google/ })).not.toBeInTheDocument();
  });
});
