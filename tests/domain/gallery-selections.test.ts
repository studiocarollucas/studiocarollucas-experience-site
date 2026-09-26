// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  selectFrom: vi.fn(),
  innerJoin: vi.fn(),
  selectWhere: vi.fn(),
  limit: vi.fn(),
  groupBy: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
  onConflictDoNothing: vi.fn(),
  delete: vi.fn(),
  deleteWhere: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: { select: mocks.select, insert: mocks.insert, delete: mocks.delete },
}));

import {
  findAuthorizedClientAsset,
  getGallerySelectionSummary,
  GallerySelectionError,
  listClientSelectedAssetIds,
  setPhotoSelection,
} from "@/domain/gallery/selections";

const CLIENT_ID = "00000000-0000-4000-8000-000000000011";
const GALLERY_ID = "00000000-0000-4000-8000-000000000012";
const ASSET_ID = "00000000-0000-4000-8000-000000000013";

const authorizedAsset = {
  assetId: ASSET_ID,
  galleryId: GALLERY_ID,
  storagePath: `gallery-assets/${GALLERY_ID}/${ASSET_ID}.jpg`,
  downloadsEnabled: false,
};

function toQuery(predicate: unknown) {
  return new PgDialect().sqlToQuery(predicate as Parameters<PgDialect["sqlToQuery"]>[0]);
}

function mockAuthorizationLookup(rows: unknown[]) {
  mocks.limit.mockResolvedValue(rows);
  mocks.selectWhere.mockReturnValue({ limit: mocks.limit });
  const joined = { innerJoin: mocks.innerJoin, where: mocks.selectWhere };
  mocks.innerJoin.mockReturnValue(joined);
  mocks.selectFrom.mockReturnValue({ innerJoin: mocks.innerJoin });
  mocks.select.mockReturnValue({ from: mocks.selectFrom });
}

describe("findAuthorizedClientAsset", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes the asset to the client's published gallery", async () => {
    mockAuthorizationLookup([authorizedAsset]);

    await expect(findAuthorizedClientAsset(CLIENT_ID, ASSET_ID)).resolves.toEqual(authorizedAsset);

    expect(mocks.innerJoin).toHaveBeenCalledTimes(2);
    const query = toQuery(mocks.selectWhere.mock.calls[0]?.[0]);
    expect(query.sql).toContain('"gallery_assets"."id" = $1');
    expect(query.sql).toContain('"shoots"."client_id" = $2');
    expect(query.sql).toContain('"galleries"."status" = $3');
    expect(query.params).toEqual([ASSET_ID, CLIENT_ID, "published"]);
  });

  it("returns null for another client's, a draft or a missing asset", async () => {
    mockAuthorizationLookup([]);

    await expect(findAuthorizedClientAsset("00000000-0000-4000-8000-000000000099", ASSET_ID)).resolves.toBeNull();
  });

  it("does not query the database for a malformed asset id", async () => {
    await expect(findAuthorizedClientAsset(CLIENT_ID, "../../etc/passwd")).resolves.toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });
});

describe("setPhotoSelection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.onConflictDoNothing.mockResolvedValue(undefined);
    mocks.insertValues.mockReturnValue({ onConflictDoNothing: mocks.onConflictDoNothing });
    mocks.insert.mockReturnValue({ values: mocks.insertValues });
    mocks.deleteWhere.mockResolvedValue(undefined);
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere });
  });

  it("favorites idempotently with the gallery derived from the authorized asset", async () => {
    mockAuthorizationLookup([authorizedAsset]);

    await expect(setPhotoSelection(CLIENT_ID, { assetId: ASSET_ID, selected: true })).resolves.toEqual({
      assetId: ASSET_ID,
      selected: true,
    });

    expect(mocks.insertValues).toHaveBeenCalledWith({ clientId: CLIENT_ID, galleryId: GALLERY_ID, assetId: ASSET_ID });
    expect(mocks.onConflictDoNothing).toHaveBeenCalledOnce();
    const conflict = mocks.onConflictDoNothing.mock.calls[0]?.[0] as { target: { name: string }[] };
    expect(conflict.target.map((column) => column.name)).toEqual(["client_id", "gallery_id", "asset_id"]);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("unfavorites by deleting only this client's row for the asset", async () => {
    mockAuthorizationLookup([authorizedAsset]);

    await expect(setPhotoSelection(CLIENT_ID, { assetId: ASSET_ID, selected: false })).resolves.toEqual({
      assetId: ASSET_ID,
      selected: false,
    });

    const query = toQuery(mocks.deleteWhere.mock.calls[0]?.[0]);
    expect(query.sql).toContain('"photo_selections"."client_id" = $1');
    expect(query.sql).toContain('"photo_selections"."gallery_id" = $2');
    expect(query.sql).toContain('"photo_selections"."asset_id" = $3');
    expect(query.params).toEqual([CLIENT_ID, GALLERY_ID, ASSET_ID]);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("refuses an asset outside the client's published gallery without writing", async () => {
    mockAuthorizationLookup([]);

    await expect(setPhotoSelection(CLIENT_ID, { assetId: ASSET_ID, selected: true })).rejects.toMatchObject({
      name: "GallerySelectionError",
      code: "not_authorized",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("rejects malformed input and never accepts a client id from the payload", async () => {
    await expect(setPhotoSelection(CLIENT_ID, { assetId: "nope", selected: true })).rejects.toBeInstanceOf(
      GallerySelectionError,
    );
    await expect(setPhotoSelection(CLIENT_ID, { assetId: ASSET_ID, selected: "yes" })).rejects.toMatchObject({
      code: "invalid_input",
    });

    mockAuthorizationLookup([authorizedAsset]);
    mocks.onConflictDoNothing.mockResolvedValue(undefined);
    await setPhotoSelection(CLIENT_ID, {
      assetId: ASSET_ID,
      selected: true,
      clientId: "00000000-0000-4000-8000-000000000099",
      galleryId: "00000000-0000-4000-8000-000000000098",
    });
    expect(mocks.insertValues).toHaveBeenCalledWith({ clientId: CLIENT_ID, galleryId: GALLERY_ID, assetId: ASSET_ID });
  });
});

describe("listClientSelectedAssetIds", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists only this client's selections in the gallery", async () => {
    mocks.selectWhere.mockResolvedValue([{ assetId: ASSET_ID }]);
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });

    await expect(listClientSelectedAssetIds(CLIENT_ID, GALLERY_ID)).resolves.toEqual([ASSET_ID]);

    const query = toQuery(mocks.selectWhere.mock.calls[0]?.[0]);
    expect(query.params).toEqual([CLIENT_ID, GALLERY_ID]);
  });
});

describe("getGallerySelectionSummary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("aggregates favorites per gallery and per asset for Admin and upsell", async () => {
    const otherAsset = "00000000-0000-4000-8000-000000000014";
    mocks.groupBy.mockResolvedValue([
      { assetId: ASSET_ID, total: 2 },
      { assetId: otherAsset, total: 1 },
    ]);
    mocks.selectWhere.mockReturnValue({ groupBy: mocks.groupBy });
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });

    await expect(getGallerySelectionSummary(GALLERY_ID)).resolves.toEqual({
      totalSelections: 3,
      byAssetId: { [ASSET_ID]: 2, [otherAsset]: 1 },
    });
    expect(toQuery(mocks.selectWhere.mock.calls[0]?.[0]).params).toEqual([GALLERY_ID]);
  });

  it("returns zero for a gallery without favorites", async () => {
    mocks.groupBy.mockResolvedValue([]);
    mocks.selectWhere.mockReturnValue({ groupBy: mocks.groupBy });
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });

    await expect(getGallerySelectionSummary(GALLERY_ID)).resolves.toEqual({ totalSelections: 0, byAssetId: {} });
  });
});
