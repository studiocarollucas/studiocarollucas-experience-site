// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalRequestContext: vi.fn(),
  setClientInventoryPreference: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/domain/portal/server", () => ({ getPortalRequestContext: mocks.getPortalRequestContext }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/domain/inventory/portal-selection", () => {
  class PortalInventorySelectionError extends Error {
    constructor(public readonly code: string) {
      super(code === "unavailable" ? "Esta peça está indisponível na data do seu ensaio." : "Seleção inválida.");
      this.name = "PortalInventorySelectionError";
    }
  }
  return {
    PortalInventorySelectionError,
    setClientInventoryPreference: mocks.setClientInventoryPreference,
  };
});

import { setInventoryPreferenceAction } from "@/app/(client)/minha-experiencia/styling/actions";
import { PortalInventorySelectionError } from "@/domain/inventory/portal-selection";
import { PortalReadError } from "@/domain/portal/read";

const ITEM_ID = "00000000-0000-4000-8000-000000000011";
const context = {
  client: { id: "client-owner", name: "Mariana" },
  viewerAuthUserId: "auth-owner",
  shoot: { id: "shoot-owner" },
};

describe("setInventoryPreferenceAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("resolves client, Auth user and shoot from the session, never from the payload", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.setClientInventoryPreference.mockResolvedValue({ inventoryItemId: ITEM_ID, state: "preferred" });
    const payload = { inventoryItemId: ITEM_ID, preferred: true, clientId: "client-attacker", shootId: "shoot-attacker" };

    await expect(setInventoryPreferenceAction(payload)).resolves.toEqual({
      ok: true,
      data: { inventoryItemId: ITEM_ID, state: "preferred" },
    });
    expect(mocks.setClientInventoryPreference).toHaveBeenCalledWith(
      { clientId: "client-owner", shootId: "shoot-owner", authUserId: "auth-owner" },
      payload,
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/minha-experiencia/styling");
  });

  it("refuses when the client has no selected shoot", async () => {
    mocks.getPortalRequestContext.mockResolvedValue({ ...context, shoot: null });

    await expect(setInventoryPreferenceAction({ inventoryItemId: ITEM_ID, preferred: true })).resolves.toMatchObject({
      ok: false,
    });
    expect(mocks.setClientInventoryPreference).not.toHaveBeenCalled();
  });

  it("returns the domain's neutral message for an unavailable item", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.setClientInventoryPreference.mockRejectedValue(new PortalInventorySelectionError("unavailable"));

    await expect(setInventoryPreferenceAction({ inventoryItemId: ITEM_ID, preferred: true })).resolves.toEqual({
      ok: false,
      error: "Esta peça está indisponível na data do seu ensaio.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("asks the client to sign in again when the session is gone", async () => {
    mocks.getPortalRequestContext.mockRejectedValue(new PortalReadError("unauthenticated"));

    const result = await setInventoryPreferenceAction({ inventoryItemId: ITEM_ID, preferred: true });

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("Entre novamente") });
    expect(mocks.setClientInventoryPreference).not.toHaveBeenCalled();
  });

  it("returns a generic error for unexpected failures", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.setClientInventoryPreference.mockRejectedValue(new Error("connection reset"));

    await expect(setInventoryPreferenceAction({ inventoryItemId: ITEM_ID, preferred: false })).resolves.toEqual({
      ok: false,
      error: "Não foi possível salvar sua escolha. Tente novamente.",
    });
  });
});
