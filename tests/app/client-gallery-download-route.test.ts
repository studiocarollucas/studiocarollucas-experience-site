// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalRequestContext: vi.fn(),
  createClientAssetDownload: vi.fn(),
}));

vi.mock("@/domain/portal/server", () => ({ getPortalRequestContext: mocks.getPortalRequestContext }));
vi.mock("@/domain/gallery/downloads", () => ({ createClientAssetDownload: mocks.createClientAssetDownload }));

import { GET } from "@/app/(client)/minha-experiencia/galeria/fotos/[assetId]/download/route";
import { PortalReadError } from "@/domain/portal/read";

const ASSET_ID = "00000000-0000-4000-8000-000000000041";
const request = new Request(`https://studio.test/minha-experiencia/galeria/fotos/${ASSET_ID}/download`);
const routeContext = () => ({ params: Promise.resolve({ assetId: ASSET_ID }) });
const context = { client: { id: "client-owner", name: "Mariana" }, viewerAuthUserId: "auth-owner", shoot: null };

describe("GET /minha-experiencia/galeria/fotos/[assetId]/download", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("redirects the owner to a short-lived signed URL without caching", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.createClientAssetDownload.mockResolvedValue({
      status: "ok",
      signedUrl: "https://private.example.test/asset?token=1",
    });

    const response = await GET(request, routeContext());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://private.example.test/asset?token=1");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.createClientAssetDownload).toHaveBeenCalledWith("client-owner", ASSET_ID);
  });

  it("refuses without a session or a linked client before authorizing anything", async () => {
    mocks.getPortalRequestContext.mockRejectedValueOnce(new PortalReadError("unauthenticated"));
    expect((await GET(request, routeContext())).status).toBe(401);

    mocks.getPortalRequestContext.mockRejectedValueOnce(new PortalReadError("unlinked"));
    expect((await GET(request, routeContext())).status).toBe(403);

    expect(mocks.createClientAssetDownload).not.toHaveBeenCalled();
  });

  it("answers 404 for a foreign or draft asset and 403 when downloads are blocked", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);

    mocks.createClientAssetDownload.mockResolvedValueOnce({ status: "not_found" });
    const missing = await GET(request, routeContext());
    expect(missing.status).toBe(404);
    expect(missing.headers.get("location")).toBeNull();

    mocks.createClientAssetDownload.mockResolvedValueOnce({ status: "blocked" });
    const blocked = await GET(request, routeContext());
    expect(blocked.status).toBe(403);
    expect(await blocked.text()).toMatch(/não está liberado/);
  });

  it("returns a neutral 500 when signing fails", async () => {
    mocks.getPortalRequestContext.mockResolvedValue(context);
    mocks.createClientAssetDownload.mockRejectedValue(new Error("gallery download URL unavailable"));

    const response = await GET(request, routeContext());

    expect(response.status).toBe(500);
    expect(response.headers.get("location")).toBeNull();
  });
});
