import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalRequestContext: vi.fn(),
  readClientGallery: vi.fn(),
  listClientSelectedAssetIds: vi.fn(),
  setPhotoSelectionAction: vi.fn(),
}));

vi.mock("@/domain/portal/server", () => ({ getPortalRequestContext: mocks.getPortalRequestContext }));
vi.mock("@/domain/gallery/portal", () => ({ readClientGallery: mocks.readClientGallery }));
vi.mock("@/domain/gallery/selections", () => ({ listClientSelectedAssetIds: mocks.listClientSelectedAssetIds }));
vi.mock("@/app/(client)/minha-experiencia/galeria/actions", () => ({
  setPhotoSelectionAction: mocks.setPhotoSelectionAction,
}));

import ClientGalleryPage from "@/app/(client)/minha-experiencia/galeria/page";

const context = { client: { id: "client-1", name: "Mariana" }, viewerAuthUserId: "auth-1", shoot: null };
const storagePath = "gallery-assets/gallery-1/asset-1.jpg";

describe("ClientGalleryPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getPortalRequestContext.mockResolvedValue(context);
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
  });
});
