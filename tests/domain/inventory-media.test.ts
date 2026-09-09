// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSignedUrls: vi.fn(),
  deleteWhere: vi.fn(),
  delete: vi.fn(),
  fromBucket: vi.fn(),
  insertReturning: vi.fn(),
  insertValues: vi.fn(),
  insert: vi.fn(),
  orderBy: vi.fn(),
  selectWhere: vi.fn(),
  selectFrom: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  updateWhere: vi.fn(),
  updateSet: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: {
    delete: mocks.delete,
    insert: mocks.insert,
    select: mocks.select,
    transaction: mocks.transaction,
    update: mocks.update,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ storage: { from: mocks.fromBucket } })),
}));

import {
  readInventoryMediaUrls,
  removeInventoryMedia,
  setInventoryMediaCover,
  uploadInventoryMedia,
} from "@/domain/inventory/media";

const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ITEM_ID = "00000000-0000-4000-8000-000000000002";
const MEDIA_ID = "00000000-0000-4000-8000-000000000003";
const OTHER_MEDIA_ID = "00000000-0000-4000-8000-000000000004";

function imageFile() {
  return new File(["image"], "look.png", { type: "image/png" });
}

function configureUploadFixture() {
  mocks.insertReturning.mockResolvedValue([
    {
      id: MEDIA_ID,
      inventoryItemId: ITEM_ID,
      storagePath: `inventory-media/${ITEM_ID}/${MEDIA_ID}.png`,
      sortOrder: 0,
      isCover: true,
      publishable: false,
    },
  ]);
  mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning });
  mocks.insert.mockReturnValue({ values: mocks.insertValues });
  mocks.upload.mockResolvedValue({ data: { path: "uploaded" }, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.fromBucket.mockReturnValue({
    upload: mocks.upload,
    remove: mocks.remove,
    createSignedUrls: mocks.createSignedUrls,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  const noCoverLimit = vi.fn().mockResolvedValue([]);
  const noCoverWhere = vi.fn(() => ({ limit: noCoverLimit }));
  mocks.selectFrom.mockReturnValue({ where: noCoverWhere });
  mocks.select.mockReturnValue({ from: mocks.selectFrom });
  mocks.transaction.mockImplementation(async (operation) =>
    operation({ select: mocks.select, update: mocks.update }),
  );
  configureUploadFixture();
});

describe("inventory media lifecycle", () => {
  it("makes the first uploaded image the item cover", async () => {
    const media = await uploadInventoryMedia({ inventoryItemId: ITEM_ID, file: imageFile() });

    expect(media).toMatchObject({ inventoryItemId: ITEM_ID, isCover: true });
    expect(mocks.insertValues).toHaveBeenCalledWith({
      id: expect.any(String),
      inventoryItemId: ITEM_ID,
      storagePath: expect.stringMatching(new RegExp(`^inventory-media/${ITEM_ID}/[0-9a-f-]{36}\\.png$`, "i")),
      sortOrder: 0,
      isCover: true,
    });
    expect(mocks.insert.mock.invocationCallOrder[0]).toBeLessThan(mocks.upload.mock.invocationCallOrder[0]);
  });

  it("clears only the current item's prior cover while setting a replacement", async () => {
    const transactionUpdateWhere = vi.fn().mockResolvedValue([]);
    const transactionUpdateSet = vi.fn(() => ({ where: transactionUpdateWhere }));
    const transactionUpdate = vi.fn(() => ({ set: transactionUpdateSet }));
    const targetLimit = vi.fn().mockResolvedValue([{ id: MEDIA_ID }]);
    const targetWhere = vi.fn(() => ({ limit: targetLimit }));
    const targetFrom = vi.fn(() => ({ where: targetWhere }));
    const transactionSelect = vi.fn(() => ({ from: targetFrom }));
    mocks.transaction.mockImplementation(async (operation) =>
      operation({ select: transactionSelect, update: transactionUpdate }),
    );

    await expect(setInventoryMediaCover({ inventoryItemId: ITEM_ID, mediaId: MEDIA_ID })).resolves.toBeUndefined();

    expect(transactionUpdateSet).toHaveBeenNthCalledWith(1, { isCover: false });
    expect(transactionUpdateSet).toHaveBeenNthCalledWith(2, { isCover: true });
    expect(transactionUpdateWhere).toHaveBeenCalledTimes(2);
  });

  it("removes the private object before its metadata", async () => {
    const media = {
      id: MEDIA_ID,
      inventoryItemId: ITEM_ID,
      storagePath: `inventory-media/${ITEM_ID}/${MEDIA_ID}.png`,
    };
    const mediaLimit = vi.fn().mockResolvedValue([media]);
    const mediaWhere = vi.fn(() => ({ limit: mediaLimit }));
    mocks.selectFrom.mockReturnValue({ where: mediaWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });
    mocks.deleteWhere.mockResolvedValue([]);
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere });

    await expect(removeInventoryMedia({ inventoryItemId: ITEM_ID, mediaId: MEDIA_ID })).resolves.toBeUndefined();

    expect(mocks.remove).toHaveBeenCalledWith([media.storagePath]);
    expect(mocks.delete.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.remove.mock.invocationCallOrder[0]);
  });

  it("compensates reserved metadata when an upload fails", async () => {
    mocks.upload.mockResolvedValue({ data: null, error: new Error("bucket unavailable") });
    mocks.deleteWhere.mockResolvedValue([]);
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere });

    await expect(uploadInventoryMedia({ inventoryItemId: ITEM_ID, file: imageFile() })).rejects.toThrow(
      "Não foi possível enviar a mídia do inventário.",
    );

    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(mocks.delete.mock.invocationCallOrder[0]);
  });

  it("restores the object when reservation cleanup cannot delete metadata", async () => {
    mocks.upload
      .mockResolvedValueOnce({ data: null, error: new Error("upload interrupted") })
      .mockResolvedValueOnce({ data: { path: "restored" }, error: null });
    mocks.deleteWhere.mockRejectedValue(new Error("metadata cleanup unavailable"));
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere });

    await expect(uploadInventoryMedia({ inventoryItemId: ITEM_ID, file: imageFile() })).rejects.toThrow(
      "Não foi possível enviar a mídia do inventário.",
    );

    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.upload).toHaveBeenCalledTimes(2);
  });

  it("returns ordered signed URLs without disclosing storage paths", async () => {
    const media = [
      {
        id: MEDIA_ID,
        inventoryItemId: ITEM_ID,
        storagePath: `inventory-media/${ITEM_ID}/${MEDIA_ID}.png`,
        sortOrder: 0,
        isCover: true,
      },
      {
        id: OTHER_MEDIA_ID,
        inventoryItemId: ITEM_ID,
        storagePath: `inventory-media/${ITEM_ID}/${OTHER_MEDIA_ID}.webp`,
        sortOrder: 1,
        isCover: false,
      },
    ];
    mocks.orderBy.mockResolvedValue(media);
    mocks.selectWhere.mockReturnValue({ orderBy: mocks.orderBy });
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });
    mocks.createSignedUrls.mockResolvedValue({
      data: media.map((item) => ({
        path: item.storagePath,
        signedUrl: `https://private.example.test/${item.id}?signed=1`,
        error: null,
      })),
      error: null,
    });

    await expect(readInventoryMediaUrls(ITEM_ID)).resolves.toEqual([
      { id: MEDIA_ID, inventoryItemId: ITEM_ID, sortOrder: 0, isCover: true, signedUrl: expect.any(String) },
      { id: OTHER_MEDIA_ID, inventoryItemId: ITEM_ID, sortOrder: 1, isCover: false, signedUrl: expect.any(String) },
    ]);
    expect(mocks.createSignedUrls).toHaveBeenCalledWith(media.map((item) => item.storagePath), 60 * 10);
  });

  it("leaves metadata intact when object deletion fails", async () => {
    const media = { id: MEDIA_ID, inventoryItemId: ITEM_ID, storagePath: `inventory-media/${ITEM_ID}/${MEDIA_ID}.png` };
    const mediaLimit = vi.fn().mockResolvedValue([media]);
    const mediaWhere = vi.fn(() => ({ limit: mediaLimit }));
    mocks.selectFrom.mockReturnValue({ where: mediaWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });
    mocks.remove.mockResolvedValue({ data: null, error: new Error("bucket unavailable") });

    await expect(removeInventoryMedia({ inventoryItemId: ITEM_ID, mediaId: MEDIA_ID })).rejects.toThrow(
      "Não foi possível remover a mídia do inventário.",
    );

    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("rejects non-image uploads before reserving media", async () => {
    await expect(
      uploadInventoryMedia({
        inventoryItemId: OTHER_ITEM_ID,
        file: new File(["no"], "invoice.pdf", { type: "application/pdf" }),
      }),
    ).rejects.toThrow();

    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
