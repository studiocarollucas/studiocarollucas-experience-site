import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalRequestContext: vi.fn(),
  readClientGalleryReveal: vi.fn(),
}));

vi.mock("@/domain/portal/server", () => ({
  getPortalRequestContext: mocks.getPortalRequestContext,
}));

vi.mock("@/domain/gallery/portal", () => ({
  readClientGalleryReveal: mocks.readClientGalleryReveal,
}));

import ClientGalleryRevealPage from "@/app/(client)/minha-experiencia/reveal/page";

describe("ClientGalleryRevealPage", () => {
  it("presents the published gallery reveal with its signed cover", async () => {
    const context = {
      client: { id: "client-1", name: "Mariana" },
      viewerAuthUserId: "auth-1",
      shoot: null,
    };
    mocks.getPortalRequestContext.mockResolvedValueOnce(context);
    mocks.readClientGalleryReveal.mockResolvedValueOnce({
      id: "gallery-1",
      title: "Suas fotos estão prontas",
      message: "Um capítulo especial da sua experiência foi preparado para você.",
      cover: {
        alt: "Capa da sua galeria",
        signedUrl: "https://private.example.test/cover.jpg?signed=1",
      },
    });

    render(await ClientGalleryRevealPage());

    expect(screen.getByRole("heading", { name: "Suas fotos estão prontas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir minha galeria" })).toHaveAttribute(
      "href",
      "/minha-experiencia/galeria",
    );
    expect(screen.getByRole("img", { name: "Capa da sua galeria" })).toHaveAttribute(
      "src",
      expect.stringContaining("signed="),
    );
    expect(mocks.getPortalRequestContext).toHaveBeenCalledOnce();
    expect(mocks.readClientGalleryReveal).toHaveBeenCalledWith(context);
  });

  it("explains availability without rendering a gallery link when reveal is unavailable", async () => {
    mocks.getPortalRequestContext.mockResolvedValueOnce({
      client: { id: "client-1", name: "Mariana" },
      viewerAuthUserId: "auth-1",
      shoot: null,
    });
    mocks.readClientGalleryReveal.mockResolvedValueOnce(null);

    render(await ClientGalleryRevealPage());

    expect(screen.getByText(/ficará disponível quando for publicada pelo estúdio/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir minha galeria" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Capa da sua galeria" })).not.toBeInTheDocument();
  });
});
