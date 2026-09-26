// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  findAuthorizedClientAsset: vi.fn(),
  createClient: vi.fn(),
  fromBucket: vi.fn(),
  createSignedUrl: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  updateWhere: vi.fn(),
  returning: vi.fn(),
  select: vi.fn(),
  selectFrom: vi.fn(),
  selectWhere: vi.fn(),
  limit: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));
vi.mock("@/domain/gallery/selections", () => ({ findAuthorizedClientAsset: mocks.findAuthorizedClientAsset }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import {
  createClientAssetDownload,
  GALLERY_DOWNLOAD_URL_TTL_SECONDS,
  setGalleryDownloadsEnabled,
} from "@/domain/gallery/downloads";

const CLIENT_ID = "00000000-0000-4000-8000-000000000021";
const GALLERY_ID = "00000000-0000-4000-8000-000000000022";
const ASSET_ID = "00000000-0000-4000-8000-000000000023";
const ACTOR_ID = "00000000-0000-4000-8000-000000000024";
const STORAGE_PATH = `gallery-assets/${GALLERY_ID}/${ASSET_ID}.png`;

describe("createClientAssetDownload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.fromBucket.mockReturnValue({ createSignedUrl: mocks.createSignedUrl });
    mocks.createClient.mockReturnValue({ storage: { from: mocks.fromBucket } });
  });

  it("signs a one-minute download of an authorized asset without exposing its path in the file name", async () => {
    mocks.findAuthorizedClientAsset.mockResolvedValue({
      assetId: ASSET_ID,
      galleryId: GALLERY_ID,
      storagePath: STORAGE_PATH,
      downloadsEnabled: true,
    });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://private.example.test/asset?token=1" },
      error: null,
    });

    await expect(createClientAssetDownload(CLIENT_ID, ASSET_ID)).resolves.toEqual({
      status: "ok",
      signedUrl: "https://private.example.test/asset?token=1",
    });

    expect(GALLERY_DOWNLOAD_URL_TTL_SECONDS).toBe(60);
    expect(mocks.findAuthorizedClientAsset).toHaveBeenCalledWith(CLIENT_ID, ASSET_ID);
    expect(mocks.fromBucket).toHaveBeenCalledWith("gallery-assets");
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(STORAGE_PATH, 60, {
      download: "studio-carol-lucas-00000000.png",
    });
  });

  it("does not sign when the gallery blocks downloads", async () => {
    mocks.findAuthorizedClientAsset.mockResolvedValue({
      assetId: ASSET_ID,
      galleryId: GALLERY_ID,
      storagePath: STORAGE_PATH,
      downloadsEnabled: false,
    });

    await expect(createClientAssetDownload(CLIENT_ID, ASSET_ID)).resolves.toEqual({ status: "blocked" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("does not sign an asset outside the client's published gallery", async () => {
    mocks.findAuthorizedClientAsset.mockResolvedValue(null);

    await expect(createClientAssetDownload(CLIENT_ID, ASSET_ID)).resolves.toEqual({ status: "not_found" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("fails loudly when storage cannot sign", async () => {
    mocks.findAuthorizedClientAsset.mockResolvedValue({
      assetId: ASSET_ID,
      galleryId: GALLERY_ID,
      storagePath: STORAGE_PATH,
      downloadsEnabled: true,
    });
    mocks.createSignedUrl.mockResolvedValue({ data: null, error: new Error("storage down") });

    await expect(createClientAssetDownload(CLIENT_ID, ASSET_ID)).rejects.toThrow("gallery download URL unavailable");
  });
});

describe("setGalleryDownloadsEnabled", () => {
  let tx: { update: typeof mocks.update; select: typeof mocks.select };

  beforeEach(() => {
    vi.resetAllMocks();
    tx = { update: mocks.update, select: mocks.select };
    mocks.transaction.mockImplementation(async (operation: (tx: unknown) => unknown) => operation(tx));
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.set.mockReturnValue({ where: mocks.updateWhere });
    mocks.updateWhere.mockReturnValue({ returning: mocks.returning });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.selectWhere.mockReturnValue({ limit: mocks.limit });
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("changes the switch only when it differs and audits it in the same transaction", async () => {
    mocks.returning.mockResolvedValue([{ id: GALLERY_ID }]);

    await expect(
      setGalleryDownloadsEnabled({ galleryId: GALLERY_ID, enabled: true, actorUserId: ACTOR_ID }),
    ).resolves.toEqual({ galleryId: GALLERY_ID, downloadsEnabled: true, changed: true });

    expect(mocks.set).toHaveBeenCalledWith({ downloadsEnabled: true });
    const query = new PgDialect().sqlToQuery(mocks.updateWhere.mock.calls[0]?.[0]);
    expect(query.sql).toContain('"galleries"."id" = $1');
    expect(query.sql).toContain('"galleries"."downloads_enabled" <> $2');
    expect(query.params).toEqual([GALLERY_ID, true]);
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      {
        actorUserId: ACTOR_ID,
        action: "gallery.downloads_updated",
        entityType: "gallery",
        entityId: GALLERY_ID,
        before: { downloadsEnabled: false },
        after: { downloadsEnabled: true },
      },
      tx,
    );
  });

  it("is a no-op without audit when the value is already set", async () => {
    mocks.returning.mockResolvedValue([]);
    mocks.limit.mockResolvedValue([{ id: GALLERY_ID }]);

    await expect(
      setGalleryDownloadsEnabled({ galleryId: GALLERY_ID, enabled: false, actorUserId: ACTOR_ID }),
    ).resolves.toEqual({ galleryId: GALLERY_ID, downloadsEnabled: false, changed: false });
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("fails for a missing gallery", async () => {
    mocks.returning.mockResolvedValue([]);
    mocks.limit.mockResolvedValue([]);

    await expect(
      setGalleryDownloadsEnabled({ galleryId: GALLERY_ID, enabled: true, actorUserId: ACTOR_ID }),
    ).rejects.toThrow("Galeria não encontrada.");
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects malformed input before touching the database", async () => {
    await expect(
      setGalleryDownloadsEnabled({ galleryId: "not-a-uuid", enabled: true, actorUserId: ACTOR_ID }),
    ).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
