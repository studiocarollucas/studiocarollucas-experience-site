// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalRequestContext: vi.fn(),
  setPhotoSelection: vi.fn(),
}));

vi.mock("@/domain/portal/server", () => ({ getPortalRequestContext: mocks.getPortalRequestContext }));
vi.mock("@/domain/gallery/selections", () => {
  class GallerySelectionError extends Error {
    constructor(public readonly code: string) {
      super(code === "invalid_input" ? "Seleção inválida." : "Esta foto não está disponível para seleção.");
      this.name = "GallerySelectionError";
    }
  }
  return { GallerySelectionError, setPhotoSelection: mocks.setPhotoSelection };
});

import { setPhotoSelectionAction } from "@/app/(client)/minha-experiencia/galeria/actions";
import { GallerySelectionError } from "@/domain/gallery/selections";
import { PortalReadError } from "@/domain/portal/read";

const ASSET_ID = "00000000-0000-4000-8000-000000000031";
const context = { client: { id: "client-owner", name: "Mariana" }, viewerAuthUserId: "auth-owner", shoot: null };

describe("setPhotoSelectionAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("resolves the client from the session, never from the payload", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.setPhotoSelection.mockResolvedValue({ assetId: ASSET_ID, selected: true });
    const payload = { assetId: ASSET_ID, selected: true, clientId: "client-attacker" };

    await expect(setPhotoSelectionAction(payload)).resolves.toEqual({
      ok: true,
      data: { assetId: ASSET_ID, selected: true },
    });
    expect(mocks.setPhotoSelection).toHaveBeenCalledWith("client-owner", payload);
  });

  it("answers neutrally for an asset outside the client's gallery", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.setPhotoSelection.mockRejectedValue(new GallerySelectionError("not_authorized"));

    await expect(setPhotoSelectionAction({ assetId: ASSET_ID, selected: true })).resolves.toEqual({
      ok: false,
      error: "Esta foto não está disponível para seleção.",
    });
  });

  it("asks the client to sign in again when the session is gone", async () => {
    mocks.getPortalRequestContext.mockRejectedValue(new PortalReadError("unauthenticated"));

    const result = await setPhotoSelectionAction({ assetId: ASSET_ID, selected: true });

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("Entre novamente") });
    expect(mocks.setPhotoSelection).not.toHaveBeenCalled();
  });

  it("returns a generic error for unexpected failures", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.setPhotoSelection.mockRejectedValue(new Error("connection reset"));

    await expect(setPhotoSelectionAction({ assetId: ASSET_ID, selected: false })).resolves.toEqual({
      ok: false,
      error: "Não foi possível salvar seu favorito. Tente novamente.",
    });
  });
});
