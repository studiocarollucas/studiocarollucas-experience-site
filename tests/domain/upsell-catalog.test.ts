// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { transaction: mocks.transaction, select: mocks.select } }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import {
  createUpsellProduct,
  deleteUpsellProduct,
  setGalleryUpsellOffers,
  updateUpsellProduct,
} from "@/domain/upsell/catalog";
import { UpsellError } from "@/domain/upsell/errors";

const ACTOR_ID = "00000000-0000-4000-8000-000000000601";
const PRODUCT_ID = "00000000-0000-4000-8000-000000000602";
const OTHER_PRODUCT_ID = "00000000-0000-4000-8000-000000000603";
const GALLERY_ID = "00000000-0000-4000-8000-000000000604";

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: PRODUCT_ID,
    kind: "album",
    name: "Álbum 20x30",
    description: null,
    internalNotes: "Fornecedor X",
    price: "890.00",
    active: true,
    sortOrder: 0,
    createdAt: new Date("2026-09-26T12:00:00.000Z"),
    updatedAt: new Date("2026-09-26T12:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Each queued select result answers one `tx.select(...)` chain, in order, whether
 * the chain ends at `where`, `limit` or `for`.
 */
function makeTx(options: { selects?: unknown[][]; insert?: unknown[]; update?: unknown[]; remove?: unknown[] } = {}) {
  const queue = [...(options.selects ?? [])];
  const select = vi.fn().mockImplementation(() => {
    const result = Promise.resolve(queue.shift() ?? []);
    const forUpdate = vi.fn().mockReturnValue(result);
    const limit = vi.fn().mockReturnValue(Object.assign(result, { for: forUpdate }));
    const where = vi.fn().mockReturnValue(Object.assign(result, { limit }));
    return { from: vi.fn().mockReturnValue({ where }) };
  });
  const insertReturning = vi.fn().mockResolvedValue(options.insert ?? []);
  const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({ returning: insertReturning, onConflictDoNothing });
  const updateReturning = vi.fn().mockResolvedValue(options.update ?? []);
  const set = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: updateReturning }) });
  const deleteReturning = vi.fn().mockResolvedValue(options.remove ?? []);
  const deleteWhere = vi.fn().mockReturnValue(Object.assign(Promise.resolve(undefined), { returning: deleteReturning }));
  const tx = {
    select,
    insert: vi.fn().mockReturnValue({ values }),
    update: vi.fn().mockReturnValue({ set }),
    delete: vi.fn().mockReturnValue({ where: deleteWhere }),
  };
  mocks.transaction.mockImplementation(async (operation: (tx: unknown) => unknown) => operation(tx));
  return { tx, values, set, onConflictDoNothing, deleteWhere };
}

describe("upsell catalog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("validates the product before opening a transaction", async () => {
    await expect(createUpsellProduct({ kind: "album", name: "", price: "10.00" }, ACTOR_ID)).rejects.toThrow();
    await expect(createUpsellProduct({ kind: "caneca", name: "Caneca", price: "10.00" }, ACTOR_ID)).rejects.toThrow();
    await expect(createUpsellProduct({ kind: "album", name: "Álbum", price: "-1.00" }, ACTOR_ID)).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a product with internal price and audits it in the same transaction", async () => {
    const created = product();
    const { tx, values } = makeTx({ insert: [created] });

    await expect(
      createUpsellProduct(
        { kind: "album", name: " Álbum 20x30 ", price: "890.00", internalNotes: "Fornecedor X" },
        ACTOR_ID,
      ),
    ).resolves.toEqual(created);

    expect(values).toHaveBeenCalledWith({
      kind: "album",
      name: "Álbum 20x30",
      description: null,
      internalNotes: "Fornecedor X",
      price: "890.00",
      active: true,
      sortOrder: 0,
    });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: ACTOR_ID,
        action: "upsell_product.created",
        entityType: "upsell_product",
        entityId: PRODUCT_ID,
        before: null,
      }),
      tx,
    );
  });

  it("translates a duplicated name into an actionable error", async () => {
    mocks.transaction.mockRejectedValue(
      Object.assign(new Error("insert failed"), { cause: { constraint_name: "upsell_products_name_unique" } }),
    );

    await expect(createUpsellProduct({ kind: "album", name: "Álbum", price: "10.00" }, ACTOR_ID)).rejects.toThrow(
      new UpsellError("Já existe um produto com este nome."),
    );
  });

  it("updates a product (deactivating it) with before/after in the audit log", async () => {
    const before = product();
    const after = product({ active: false, description: null });
    const { tx, set } = makeTx({ selects: [[before]], update: [after] });

    await expect(
      updateUpsellProduct(
        { id: PRODUCT_ID, kind: "album", name: "Álbum 20x30", price: "890.00", active: false },
        ACTOR_ID,
      ),
    ).resolves.toEqual(after);

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ active: false, description: null, updatedAt: expect.any(Date) }));
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "upsell_product.updated", entityId: PRODUCT_ID, before, after }),
      tx,
    );
  });

  it("rejects updating or deleting an unknown product", async () => {
    makeTx({ selects: [[]] });
    await expect(
      updateUpsellProduct({ id: PRODUCT_ID, kind: "album", name: "Álbum", price: "1.00" }, ACTOR_ID),
    ).rejects.toThrow(new UpsellError("Produto inexistente."));

    makeTx({ remove: [] });
    await expect(deleteUpsellProduct({ id: PRODUCT_ID }, ACTOR_ID)).rejects.toThrow(new UpsellError("Produto inexistente."));
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("deletes a product and audits the removed row", async () => {
    const removed = product();
    const { tx } = makeTx({ remove: [removed] });

    await expect(deleteUpsellProduct({ id: PRODUCT_ID }, ACTOR_ID)).resolves.toEqual({ id: PRODUCT_ID });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "upsell_product.deleted", before: removed, after: null }),
      tx,
    );
  });
});

describe("setGalleryUpsellOffers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("adds and removes offers for the gallery and audits the change", async () => {
    const { tx, values, onConflictDoNothing } = makeTx({
      selects: [[{ id: GALLERY_ID }], [{ id: OTHER_PRODUCT_ID }], [{ productId: PRODUCT_ID }]],
    });

    await expect(
      setGalleryUpsellOffers({ galleryId: GALLERY_ID, productIds: [OTHER_PRODUCT_ID] }, ACTOR_ID),
    ).resolves.toEqual({ galleryId: GALLERY_ID, productIds: [OTHER_PRODUCT_ID], changed: true });

    expect(tx.delete).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith([{ galleryId: GALLERY_ID, productId: OTHER_PRODUCT_ID }]);
    expect(onConflictDoNothing).toHaveBeenCalled();
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "gallery.upsell_offers_updated",
        entityType: "gallery",
        entityId: GALLERY_ID,
        before: { productIds: [PRODUCT_ID] },
        after: { productIds: [OTHER_PRODUCT_ID] },
      }),
      tx,
    );
  });

  it("is a no-op without audit when the offers did not change", async () => {
    const { tx } = makeTx({ selects: [[{ id: GALLERY_ID }], [{ id: PRODUCT_ID }], [{ productId: PRODUCT_ID }]] });

    await expect(
      setGalleryUpsellOffers({ galleryId: GALLERY_ID, productIds: [PRODUCT_ID] }, ACTOR_ID),
    ).resolves.toEqual({ galleryId: GALLERY_ID, productIds: [PRODUCT_ID], changed: false });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.delete).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects unknown galleries and products", async () => {
    makeTx({ selects: [[]] });
    await expect(setGalleryUpsellOffers({ galleryId: GALLERY_ID, productIds: [] }, ACTOR_ID)).rejects.toThrow(
      new UpsellError("Galeria não encontrada."),
    );

    makeTx({ selects: [[{ id: GALLERY_ID }], []] });
    await expect(
      setGalleryUpsellOffers({ galleryId: GALLERY_ID, productIds: [PRODUCT_ID] }, ACTOR_ID),
    ).rejects.toThrow(new UpsellError("Produto inexistente."));
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });
});
