// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteReturning: vi.fn(),
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
  updateReturning: vi.fn(),
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
  createSupabaseServerClient: vi.fn(async () => ({
    storage: { from: mocks.fromBucket },
  })),
}));

import {
  publishGallery,
  removeGalleryAsset,
  reorderGalleryAssets,
  uploadGalleryAsset,
} from "@/domain/gallery/assets";

const GALLERY_ID = "00000000-0000-4000-8000-000000000001";
const ASSET_ID = "00000000-0000-4000-8000-000000000002";
const OTHER_ASSET_ID = "00000000-0000-4000-8000-000000000003";

function imageFile() {
  return new File(["image"], "portrait.png", { type: "image/png" });
}

function configureUploadFixture() {
  mocks.insertReturning.mockResolvedValue([
    {
      id: ASSET_ID,
      galleryId: GALLERY_ID,
      storagePath: `gallery-assets/${GALLERY_ID}/${ASSET_ID}.png`,
      sortOrder: 0,
    },
  ]);
  mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning });
  mocks.insert.mockReturnValue({ values: mocks.insertValues });
  mocks.upload.mockResolvedValue({ data: { path: "uploaded" }, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.fromBucket.mockReturnValue({ upload: mocks.upload, remove: mocks.remove });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(async (operation) => operation({ select: mocks.select, update: mocks.update }));
  configureUploadFixture();
});

describe("gallery asset lifecycle", () => {
  it("rejects a non-image before reserving metadata", async () => {
    await expect(
      uploadGalleryAsset({
        galleryId: GALLERY_ID,
        file: new File(["x"], "x.pdf", { type: "application/pdf" }),
      }),
    ).rejects.toThrow();

    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("reserves private metadata before uploading an allowed image", async () => {
    const asset = await uploadGalleryAsset({ galleryId: GALLERY_ID, file: imageFile() });

    expect(asset).toMatchObject({ id: ASSET_ID, galleryId: GALLERY_ID, sortOrder: 0 });
    expect(mocks.insertValues).toHaveBeenCalledWith({
      id: expect.any(String),
      galleryId: GALLERY_ID,
      storagePath: expect.stringMatching(new RegExp(`^gallery-assets/${GALLERY_ID}/[0-9a-f-]{36}\\.png$`, "i")),
      sortOrder: 0,
    });
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^gallery-assets/${GALLERY_ID}/[0-9a-f-]{36}\\.png$`, "i")),
      expect.objectContaining({ type: "image/png", size: 5 }),
      { contentType: "image/png", upsert: false },
    );
    expect(mocks.insert.mock.invocationCallOrder[0]).toBeLessThan(mocks.upload.mock.invocationCallOrder[0]);
  });

  it("does not touch Storage when metadata reservation fails", async () => {
    mocks.insertReturning.mockResolvedValue([]);

    await expect(uploadGalleryAsset({ galleryId: GALLERY_ID, file: imageFile() })).rejects.toThrow(
      "Não foi possível salvar a foto da galeria.",
    );

    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("removes the reserved metadata after a Storage upload failure", async () => {
    mocks.upload.mockResolvedValue({ data: null, error: new Error("bucket denied") });
    mocks.deleteReturning.mockResolvedValue([{ id: ASSET_ID }]);
    mocks.deleteWhere.mockReturnValue({ returning: mocks.deleteReturning });
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere });

    await expect(uploadGalleryAsset({ galleryId: GALLERY_ID, file: imageFile() })).rejects.toThrow(
      "Não foi possível enviar a foto da galeria.",
    );

    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(mocks.delete.mock.invocationCallOrder[0]);
  });

  it("keeps the metadata reservation when upload cleanup cannot remove the object", async () => {
    const uploadError = new Error("upload interrupted");
    const removeError = new Error("object cleanup unavailable");
    mocks.upload.mockResolvedValue({ data: null, error: uploadError });
    mocks.remove.mockResolvedValue({ data: null, error: removeError });

    const rejection = uploadGalleryAsset({ galleryId: GALLERY_ID, file: imageFile() });
    await expect(rejection).rejects.toMatchObject({
      message: "Não foi possível enviar a foto da galeria.",
      context: {
        galleryId: GALLERY_ID,
        assetId: expect.any(String),
        storagePath: expect.stringMatching(new RegExp(`^gallery-assets/${GALLERY_ID}/`)),
      },
    });
    await rejection.catch((error: unknown) => {
      expect((error as Error).cause).toBeInstanceOf(AggregateError);
      expect(((error as Error).cause as AggregateError).errors).toEqual(
        expect.arrayContaining([uploadError, removeError]),
      );
    });

    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("reuploads the object when reservation cleanup cannot delete metadata", async () => {
    const uploadError = new Error("upload interrupted");
    const deleteError = new Error("reservation delete unavailable");
    mocks.upload
      .mockResolvedValueOnce({ data: null, error: uploadError })
      .mockResolvedValueOnce({ data: { path: "restored" }, error: null });
    mocks.deleteWhere.mockRejectedValue(deleteError);
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere });

    const rejection = uploadGalleryAsset({ galleryId: GALLERY_ID, file: imageFile() });
    await expect(rejection).rejects.toMatchObject({
      message: "Não foi possível enviar a foto da galeria.",
      context: {
        galleryId: GALLERY_ID,
        assetId: expect.any(String),
        storagePath: expect.stringMatching(new RegExp(`^gallery-assets/${GALLERY_ID}/`)),
      },
    });
    await rejection.catch((error: unknown) => {
      expect((error as Error).cause).toBeInstanceOf(AggregateError);
      expect(((error as Error).cause as AggregateError).errors).toEqual(
        expect.arrayContaining([uploadError, deleteError]),
      );
    });

    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(mocks.delete.mock.invocationCallOrder[0]);
    expect(mocks.delete.mock.invocationCallOrder[0]).toBeLessThan(mocks.upload.mock.invocationCallOrder[1]);
  });

  it("reorders exactly the supplied asset ids", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: OTHER_ASSET_ID }, { id: ASSET_ID }]);
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });
    mocks.updateReturning
      .mockResolvedValueOnce([{ id: OTHER_ASSET_ID }])
      .mockResolvedValueOnce([{ id: ASSET_ID }]);
    mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning });
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.update.mockReturnValue({ set: mocks.updateSet });

    await expect(
      reorderGalleryAssets({ galleryId: GALLERY_ID, assetIds: [OTHER_ASSET_ID, ASSET_ID] }),
    ).resolves.toEqual([OTHER_ASSET_ID, ASSET_ID]);

    expect(mocks.updateSet).toHaveBeenNthCalledWith(1, { sortOrder: 0 });
    expect(mocks.updateSet).toHaveBeenNthCalledWith(2, { sortOrder: 1 });
  });

  it("validates every asset belongs to the gallery before changing any order", async () => {
    mocks.selectWhere.mockResolvedValue([{ id: ASSET_ID }]);
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });

    await expect(
      reorderGalleryAssets({ galleryId: GALLERY_ID, assetIds: [ASSET_ID, OTHER_ASSET_ID] }),
    ).rejects.toThrow("A foto não pertence a esta galeria.");

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects duplicate ids before updating the gallery order", async () => {
    await expect(
      reorderGalleryAssets({ galleryId: GALLERY_ID, assetIds: [ASSET_ID, ASSET_ID] }),
    ).rejects.toThrow();

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("removes metadata before the private object so a Storage failure can be compensated", async () => {
    mocks.deleteReturning.mockResolvedValue([
      { id: ASSET_ID, galleryId: GALLERY_ID, storagePath: `gallery-assets/${GALLERY_ID}/${ASSET_ID}.png` },
    ]);
    mocks.deleteWhere.mockReturnValue({ returning: mocks.deleteReturning });
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere });

    await expect(removeGalleryAsset({ galleryId: GALLERY_ID, assetId: ASSET_ID })).resolves.toBeUndefined();

    expect(mocks.remove).toHaveBeenCalledWith([`gallery-assets/${GALLERY_ID}/${ASSET_ID}.png`]);
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.delete.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
  });

  it("restores metadata when private object removal fails", async () => {
    const asset = {
      id: ASSET_ID,
      galleryId: GALLERY_ID,
      storagePath: `gallery-assets/${GALLERY_ID}/${ASSET_ID}.png`,
      sortOrder: 3,
      createdAt: new Date("2026-09-08T00:00:00.000Z"),
    };
    mocks.selectWhere.mockResolvedValue([asset]);
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });
    mocks.deleteReturning.mockResolvedValue([asset]);
    mocks.deleteWhere.mockReturnValue({ returning: mocks.deleteReturning });
    mocks.delete.mockReturnValue({ where: mocks.deleteWhere });
    mocks.remove.mockResolvedValue({ data: null, error: new Error("bucket unavailable") });

    await expect(removeGalleryAsset({ galleryId: GALLERY_ID, assetId: ASSET_ID })).rejects.toThrow(
      "Não foi possível remover a foto da galeria.",
    );

    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.insertValues).toHaveBeenCalledWith(asset);
    expect(mocks.delete.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
  });

  it("marks a draft gallery published and returns the ordered asset ids", async () => {
    mocks.updateReturning.mockResolvedValue([{ id: GALLERY_ID, status: "published" }]);
    mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning });
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.update.mockReturnValue({ set: mocks.updateSet });
    mocks.orderBy.mockResolvedValue([{ id: OTHER_ASSET_ID }, { id: ASSET_ID }]);
    mocks.selectWhere.mockReturnValue({ orderBy: mocks.orderBy });
    mocks.selectFrom.mockReturnValue({ where: mocks.selectWhere });
    mocks.select.mockReturnValue({ from: mocks.selectFrom });

    await expect(publishGallery(GALLERY_ID)).resolves.toMatchObject({
      id: GALLERY_ID,
      status: "published",
      assetIds: [OTHER_ASSET_ID, ASSET_ID],
    });
  });

  it("rejects publication when the gallery does not exist", async () => {
    mocks.updateReturning.mockResolvedValue([]);
    mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning });
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.update.mockReturnValue({ set: mocks.updateSet });

    await expect(publishGallery(GALLERY_ID)).rejects.toThrow("Galeria não encontrada.");
  });
});
