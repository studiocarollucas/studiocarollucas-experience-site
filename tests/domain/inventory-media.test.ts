// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  authorize: vi.fn(),
  execute: vi.fn(),
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
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.audit }));
vi.mock("@/domain/inventory/authorization", () => ({
  requireInventoryCatalogActor: mocks.authorize,
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
  reorderInventoryMedia,
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
    operation({
      select: mocks.select,
      update: mocks.update,
      insert: mocks.insert,
      delete: mocks.delete,
      execute: mocks.execute,
    })
  );
  configureUploadFixture();
});

describe("inventory media lifecycle", () => {
  it("audits upload metadata transactionally with the actor and appends after existing order", async () => {
    mocks.selectFrom.mockReturnValue({
      where: () => ({ limit: async () => [{ sortOrder: 4, hasCover: true }] }),
    });
    await uploadInventoryMedia({ inventoryItemId: ITEM_ID, file: imageFile() }, "staff-1");
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 5, isCover: false })
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "staff-1",
        action: "inventory_media.uploaded",
        entityType: "inventory_media",
      }),
      expect.objectContaining({ insert: mocks.insert })
    );
    expect(mocks.execute).toHaveBeenCalled();
  });

  it("persists and audits the complete media order under the item lock", async () => {
    mocks.selectFrom.mockReturnValue({
      where: async () => [
        { id: MEDIA_ID, sortOrder: 0 },
        { id: OTHER_MEDIA_ID, sortOrder: 0 },
      ],
    });
    mocks.updateWhere.mockResolvedValue([]);
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.update.mockReturnValue({ set: mocks.updateSet });
    expect(typeof reorderInventoryMedia).toBe("function");
    await reorderInventoryMedia(
      { inventoryItemId: ITEM_ID, mediaIds: [OTHER_MEDIA_ID, MEDIA_ID] },
      "staff-1"
    );
    expect(mocks.updateSet.mock.calls).toEqual([[{ sortOrder: 0 }], [{ sortOrder: 1 }]]);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "staff-1",
        action: "inventory_media.reordered",
        entityId: ITEM_ID,
        after: [OTHER_MEDIA_ID, MEDIA_ID],
      }),
      expect.objectContaining({ update: mocks.update })
    );
    expect(mocks.execute).toHaveBeenCalled();
    expect(mocks.fromBucket).not.toHaveBeenCalled();
  });

  it.each([[MEDIA_ID, MEDIA_ID], [OTHER_MEDIA_ID], [MEDIA_ID, OTHER_MEDIA_ID]])(
    "rejects duplicate, foreign or incomplete media order %j",
    async (...mediaIds) => {
      mocks.selectFrom.mockReturnValue({ where: async () => [{ id: MEDIA_ID, sortOrder: 0 }] });
      expect(typeof reorderInventoryMedia).toBe("function");
      await expect(
        reorderInventoryMedia({ inventoryItemId: ITEM_ID, mediaIds }, "staff-1")
      ).rejects.toThrow();
      expect(mocks.update).not.toHaveBeenCalled();
      expect(mocks.audit).not.toHaveBeenCalled();
    }
  );
  it("passes the uploaded File bytes to storage instead of only parsed metadata", async () => {
    const file = imageFile();
    await uploadInventoryMedia({ inventoryItemId: ITEM_ID, file }, "staff-1");
    expect(mocks.upload.mock.calls[0][1]).toBe(file);
    await expect(mocks.upload.mock.calls[0][1].text()).resolves.toBe("image");
  });

  it("makes the first uploaded image the item cover", async () => {
    const media = await uploadInventoryMedia(
      { inventoryItemId: ITEM_ID, file: imageFile() },
      "staff-1"
    );

    expect(media).toMatchObject({ inventoryItemId: ITEM_ID, isCover: true });
    expect(mocks.insertValues).toHaveBeenCalledWith({
      id: expect.any(String),
      inventoryItemId: ITEM_ID,
      storagePath: expect.stringMatching(
        new RegExp(`^inventory-media/${ITEM_ID}/[0-9a-f-]{36}\\.png$`, "i")
      ),
      sortOrder: 0,
      isCover: true,
    });
    expect(mocks.insert.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.upload.mock.invocationCallOrder[0]
    );
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
      operation({ select: transactionSelect, update: transactionUpdate, execute: mocks.execute })
    );

    await expect(
      setInventoryMediaCover({ inventoryItemId: ITEM_ID, mediaId: MEDIA_ID }, "staff-1")
    ).resolves.toBeUndefined();
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "staff-1",
        action: "inventory_media.cover_changed",
        entityId: MEDIA_ID,
      }),
      expect.objectContaining({ update: transactionUpdate })
    );

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

    await expect(
      removeInventoryMedia({ inventoryItemId: ITEM_ID, mediaId: MEDIA_ID }, "staff-1")
    ).resolves.toBeUndefined();
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "staff-1",
        action: "inventory_media.removed",
        entityId: MEDIA_ID,
        before: media,
        after: null,
      }),
      expect.objectContaining({ delete: mocks.delete })
    );

    expect(mocks.remove).toHaveBeenCalledWith([media.storagePath]);
    expect(mocks.delete.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.remove.mock.invocationCallOrder[0]
    );
  });

  it("compensates reserved metadata when an upload fails", async () => {
    mocks.upload.mockResolvedValue({ data: null, error: new Error("bucket unavailable") });
    mocks.deleteWhere.mockResolvedValue([]);
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere });

    await expect(
      uploadInventoryMedia({ inventoryItemId: ITEM_ID, file: imageFile() }, "staff-1")
    ).rejects.toThrow("Não foi possível enviar a mídia do inventário.");

    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.delete.mock.invocationCallOrder[0]
    );
    expect(mocks.audit).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: "inventory_media.upload_failed", after: null }),
      expect.objectContaining({ delete: mocks.delete })
    );
    expect(mocks.audit.mock.calls.map(([event]) => event.action)).not.toContain(
      "inventory_media.uploaded"
    );
  });

  it("restores the object when reservation cleanup cannot delete metadata", async () => {
    mocks.upload
      .mockResolvedValueOnce({ data: null, error: new Error("upload interrupted") })
      .mockResolvedValueOnce({ data: { path: "restored" }, error: null });
    mocks.deleteWhere.mockRejectedValue(new Error("metadata cleanup unavailable"));
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere });

    await expect(
      uploadInventoryMedia({ inventoryItemId: ITEM_ID, file: imageFile() }, "staff-1")
    ).rejects.toThrow("Não foi possível enviar a mídia do inventário.");

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
      {
        id: MEDIA_ID,
        inventoryItemId: ITEM_ID,
        sortOrder: 0,
        isCover: true,
        signedUrl: expect.any(String),
      },
      {
        id: OTHER_MEDIA_ID,
        inventoryItemId: ITEM_ID,
        sortOrder: 1,
        isCover: false,
        signedUrl: expect.any(String),
      },
    ]);
    expect(mocks.createSignedUrls).toHaveBeenCalledWith(
      media.map((item) => item.storagePath),
      60 * 10
    );
  });

  it("leaves metadata intact when object deletion fails", async () => {
    const media = {
      id: MEDIA_ID,
      inventoryItemId: ITEM_ID,
      storagePath: `inventory-media/${ITEM_ID}/${MEDIA_ID}.png`,
    };
    const mediaLimit = vi.fn().mockResolvedValue([media]);
    const mediaWhere = vi.fn(() => ({ limit: mediaLimit }));
    mocks.selectFrom.mockReturnValue({ where: mediaWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });
    mocks.remove.mockResolvedValue({ data: null, error: new Error("bucket unavailable") });

    await expect(
      removeInventoryMedia({ inventoryItemId: ITEM_ID, mediaId: MEDIA_ID }, "staff-1")
    ).rejects.toThrow("Não foi possível remover a mídia do inventário.");

    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("rejects non-image uploads before reserving media", async () => {
    await expect(
      uploadInventoryMedia(
        {
          inventoryItemId: OTHER_ITEM_ID,
          file: new File(["no"], "invoice.pdf", { type: "application/pdf" }),
        },
        "staff-1"
      )
    ).rejects.toThrow();

    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
