import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setPhotoSelectionAction: vi.fn() }));

vi.mock("@/app/(client)/minha-experiencia/galeria/actions", () => ({
  setPhotoSelectionAction: mocks.setPhotoSelectionAction,
}));

import { ClientGalleryGrid } from "@/components/client/gallery-grid";

const assets = [
  { id: "asset-1", signedUrl: "https://private.example.test/asset-1?signed=1" },
  { id: "asset-2", signedUrl: "https://private.example.test/asset-2?signed=1" },
];

describe("ClientGalleryGrid", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("favorites a photo with the desired state and keeps the server's answer", async () => {
    mocks.setPhotoSelectionAction.mockResolvedValue({ ok: true, data: { assetId: "asset-1", selected: true } });
    render(<ClientGalleryGrid assets={assets} initialSelectedAssetIds={[]} downloadsEnabled={false} />);

    const button = screen.getByRole("button", { name: "Favoritar foto 1" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(screen.getByText("1 foto favorita")).toBeInTheDocument());
    expect(mocks.setPhotoSelectionAction).toHaveBeenCalledWith({ assetId: "asset-1", selected: true });
    expect(mocks.setPhotoSelectionAction.mock.calls[0]?.[0]).not.toHaveProperty("clientId");
  });

  it("unfavorites an already selected photo", async () => {
    mocks.setPhotoSelectionAction.mockResolvedValue({ ok: true, data: { assetId: "asset-2", selected: false } });
    render(<ClientGalleryGrid assets={assets} initialSelectedAssetIds={["asset-2"]} downloadsEnabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Favoritar foto 2" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Favoritar foto 2" })).toHaveAttribute("aria-pressed", "false"),
    );
    expect(mocks.setPhotoSelectionAction).toHaveBeenCalledWith({ assetId: "asset-2", selected: false });
  });

  it("reverts and announces the error when the server refuses", async () => {
    mocks.setPhotoSelectionAction.mockResolvedValue({ ok: false, error: "Esta foto não está disponível para seleção." });
    render(<ClientGalleryGrid assets={assets} initialSelectedAssetIds={[]} downloadsEnabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Favoritar foto 1" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Esta foto não está disponível para seleção.");
    expect(screen.getByRole("button", { name: "Favoritar foto 1" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reverts when the request itself fails", async () => {
    mocks.setPhotoSelectionAction.mockRejectedValue(new Error("network"));
    render(<ClientGalleryGrid assets={assets} initialSelectedAssetIds={["asset-1"]} downloadsEnabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Favoritar foto 1" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar seu favorito.");
    expect(screen.getByRole("button", { name: "Favoritar foto 1" })).toHaveAttribute("aria-pressed", "true");
  });

  it("links downloads to the authorizing route only when allowed", () => {
    const { rerender } = render(
      <ClientGalleryGrid assets={assets} initialSelectedAssetIds={[]} downloadsEnabled={true} />,
    );

    expect(screen.getByRole("link", { name: "Baixar foto 2" })).toHaveAttribute(
      "href",
      "/minha-experiencia/galeria/fotos/asset-2/download",
    );

    rerender(<ClientGalleryGrid assets={assets} initialSelectedAssetIds={[]} downloadsEnabled={false} />);
    expect(screen.queryByRole("link", { name: /Baixar foto/ })).not.toBeInTheDocument();
  });
});
