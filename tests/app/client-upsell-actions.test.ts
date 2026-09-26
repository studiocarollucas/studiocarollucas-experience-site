// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalRequestContext: vi.fn(),
  requestUpsellOrder: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/domain/portal/server", () => ({ getPortalRequestContext: mocks.getPortalRequestContext }));
vi.mock("@/domain/upsell/portal", () => ({ requestUpsellOrder: mocks.requestUpsellOrder }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { requestUpsellOrderAction } from "@/app/(client)/minha-experiencia/galeria/upsell-actions";
import { PortalReadError } from "@/domain/portal/read";
import { UpsellError } from "@/domain/upsell/errors";

const ORDER_ID = "00000000-0000-4000-8000-000000000c01";
const context = { client: { id: "client-owner", name: "Mariana" }, viewerAuthUserId: "auth-owner", shoot: null };
const payload = {
  galleryId: "00000000-0000-4000-8000-000000000c02",
  requestKey: "00000000-0000-4000-8000-000000000c03",
  items: [{ productId: "00000000-0000-4000-8000-000000000c04", quantity: 2 }],
};

describe("requestUpsellOrderAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("resolves the client and the actor from the session, never from the payload", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.requestUpsellOrder.mockResolvedValue({
      order: { id: ORDER_ID, status: "solicitado", total: "70.00" },
      created: true,
    });
    const tampered = { ...payload, clientId: "client-attacker", total: "0.01" };

    await expect(requestUpsellOrderAction(tampered)).resolves.toEqual({
      ok: true,
      data: { orderId: ORDER_ID, created: true },
    });
    expect(mocks.requestUpsellOrder).toHaveBeenCalledWith("client-owner", "auth-owner", tampered);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/minha-experiencia/galeria");
  });

  it("reports a repeated submit as the same order", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.requestUpsellOrder.mockResolvedValue({
      order: { id: ORDER_ID, status: "solicitado", total: "70.00" },
      created: false,
    });

    await expect(requestUpsellOrderAction(payload)).resolves.toEqual({
      ok: true,
      data: { orderId: ORDER_ID, created: false },
    });
  });

  it("shows rule violations to the client as is", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.requestUpsellOrder.mockRejectedValue(new UpsellError("Este produto não está disponível na sua galeria."));

    await expect(requestUpsellOrderAction(payload)).resolves.toEqual({
      ok: false,
      error: "Este produto não está disponível na sua galeria.",
    });
  });

  it("asks the client to sign in again when the session is gone", async () => {
    mocks.getPortalRequestContext.mockRejectedValue(new PortalReadError("unauthenticated"));

    const result = await requestUpsellOrderAction(payload);

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("Entre novamente") });
    expect(mocks.requestUpsellOrder).not.toHaveBeenCalled();
  });

  it("returns a generic error for unexpected failures", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.requestUpsellOrder.mockRejectedValue(new Error("connection reset"));

    await expect(requestUpsellOrderAction(payload)).resolves.toEqual({
      ok: false,
      error: "Não foi possível enviar seu pedido. Tente novamente.",
    });
  });
});
