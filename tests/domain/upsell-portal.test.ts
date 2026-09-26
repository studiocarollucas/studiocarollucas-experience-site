// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { transaction: mocks.transaction, select: mocks.select } }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import { upsellOrderItems, upsellOrders } from "@/db/schema";
import { UpsellError } from "@/domain/upsell/errors";
import { listClientGalleryOffers, requestUpsellOrder } from "@/domain/upsell/portal";

const CLIENT_ID = "00000000-0000-4000-8000-000000000701";
const AUTH_USER_ID = "00000000-0000-4000-8000-000000000702";
const GALLERY_ID = "00000000-0000-4000-8000-000000000703";
const SHOOT_ID = "00000000-0000-4000-8000-000000000704";
const PHOTO = "00000000-0000-4000-8000-000000000705";
const ALBUM = "00000000-0000-4000-8000-000000000706";
const ORDER_ID = "00000000-0000-4000-8000-000000000707";
const REQUEST_KEY = "00000000-0000-4000-8000-000000000708";

const offers = [
  { productId: PHOTO, kind: "foto_adicional", name: "Foto adicional", description: null, price: "35.00" },
  { productId: ALBUM, kind: "album", name: "Álbum", description: "Capa em linho", price: "890.00" },
];

/** A drizzle-like query chain: every builder method returns itself; awaiting it yields `result`. */
function chain(result: unknown) {
  const promise = Promise.resolve(result);
  const query: Record<string, unknown> = {};
  for (const method of ["from", "innerJoin", "leftJoin", "where", "limit", "for", "orderBy", "groupBy"]) {
    query[method] = vi.fn(() => query);
  }
  query.then = promise.then.bind(promise);
  return query;
}

function makeTx(selects: unknown[][], orderInsert: unknown[] = []) {
  const queue = [...selects];
  const inserted: { table: unknown; values: unknown }[] = [];
  const onConflictDoNothing = vi.fn();
  const tx = {
    select: vi.fn(() => chain(queue.shift() ?? [])),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: unknown) => {
        inserted.push({ table, values });
        const returning = vi.fn().mockResolvedValue(orderInsert);
        onConflictDoNothing.mockReturnValue({ returning });
        return Object.assign(Promise.resolve(undefined), { onConflictDoNothing, returning });
      }),
    })),
  };
  mocks.transaction.mockImplementation(async (operation: (tx: unknown) => unknown) => operation(tx));
  return { tx, inserted, onConflictDoNothing };
}

const galleryRow = { galleryId: GALLERY_ID, shootId: SHOOT_ID, includedPhotos: 20 };

describe("requestUpsellOrder", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("rejects invalid payloads before opening a transaction", async () => {
    await expect(
      requestUpsellOrder(CLIENT_ID, AUTH_USER_ID, { galleryId: GALLERY_ID, requestKey: REQUEST_KEY, items: [] }),
    ).rejects.toThrow(new UpsellError("Revise os produtos e as quantidades do pedido."));
    await expect(
      requestUpsellOrder(CLIENT_ID, AUTH_USER_ID, {
        galleryId: GALLERY_ID,
        requestKey: REQUEST_KEY,
        items: [{ productId: PHOTO, quantity: 100 }],
      }),
    ).rejects.toThrow(UpsellError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a solicitado order priced on the server with snapshotted items, ignoring browser prices", async () => {
    const order = { id: ORDER_ID, status: "solicitado", total: "1310.00" };
    const { tx, inserted, onConflictDoNothing } = makeTx([[], [galleryRow], offers], [order]);

    const result = await requestUpsellOrder(CLIENT_ID, AUTH_USER_ID, {
      galleryId: GALLERY_ID,
      requestKey: REQUEST_KEY,
      clientId: "00000000-0000-4000-8000-000000000799",
      total: "1.00",
      items: [
        { productId: PHOTO, quantity: 12, price: "0.01" },
        { productId: ALBUM, quantity: 1 },
      ],
      notes: "Capa clara, por favor",
    });

    expect(result).toEqual({ order, created: true });
    expect(inserted[0]).toEqual({
      table: upsellOrders,
      values: {
        clientId: CLIENT_ID,
        shootId: SHOOT_ID,
        galleryId: GALLERY_ID,
        status: "solicitado",
        total: "1310.00",
        clientNotes: "Capa clara, por favor",
        requestKey: REQUEST_KEY,
      },
    });
    expect(onConflictDoNothing).toHaveBeenCalled();
    expect(inserted[1]).toEqual({
      table: upsellOrderItems,
      values: [
        {
          orderId: ORDER_ID,
          productId: PHOTO,
          kind: "foto_adicional",
          name: "Foto adicional",
          description: null,
          unitPrice: "35.00",
          quantity: 12,
          lineTotal: "420.00",
        },
        {
          orderId: ORDER_ID,
          productId: ALBUM,
          kind: "album",
          name: "Álbum",
          description: "Capa em linho",
          unitPrice: "890.00",
          quantity: 1,
          lineTotal: "890.00",
        },
      ],
    });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: AUTH_USER_ID,
        action: "upsell_order.requested",
        entityType: "upsell_order",
        entityId: ORDER_ID,
        before: null,
        after: expect.objectContaining({ clientId: CLIENT_ID, total: "1310.00" }),
      }),
      tx,
    );
  });

  it("returns the existing order for a repeated request key without writing or auditing again", async () => {
    const existing = { id: ORDER_ID, status: "confirmado", total: "35.00" };
    const { tx } = makeTx([[existing]]);

    await expect(
      requestUpsellOrder(CLIENT_ID, AUTH_USER_ID, {
        galleryId: GALLERY_ID,
        requestKey: REQUEST_KEY,
        items: [{ productId: PHOTO, quantity: 1 }],
      }),
    ).resolves.toEqual({ order: existing, created: false });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("returns the concurrent order when the insert loses the race on the request key", async () => {
    const raced = { id: ORDER_ID, status: "solicitado", total: "35.00" };
    const { inserted } = makeTx([[], [galleryRow], offers, [raced]], []);

    await expect(
      requestUpsellOrder(CLIENT_ID, AUTH_USER_ID, {
        galleryId: GALLERY_ID,
        requestKey: REQUEST_KEY,
        items: [{ productId: PHOTO, quantity: 1 }],
      }),
    ).resolves.toEqual({ order: raced, created: false });
    expect(inserted).toHaveLength(1);
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("refuses galleries that are not published for this client", async () => {
    const { tx } = makeTx([[], []]);

    await expect(
      requestUpsellOrder(CLIENT_ID, AUTH_USER_ID, {
        galleryId: GALLERY_ID,
        requestKey: REQUEST_KEY,
        items: [{ productId: PHOTO, quantity: 1 }],
      }),
    ).rejects.toThrow(new UpsellError("Esta galeria não está disponível para pedidos."));
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("refuses products the gallery does not offer (or that are inactive)", async () => {
    const { tx } = makeTx([[], [galleryRow], [offers[0]]]);

    await expect(
      requestUpsellOrder(CLIENT_ID, AUTH_USER_ID, {
        galleryId: GALLERY_ID,
        requestKey: REQUEST_KEY,
        items: [{ productId: ALBUM, quantity: 1 }],
      }),
    ).rejects.toThrow(new UpsellError("Este produto não está disponível na sua galeria."));
    expect(tx.insert).not.toHaveBeenCalled();
  });
});

describe("listClientGalleryOffers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns only client-safe offer fields and the package's included photos", async () => {
    const queue: unknown[][] = [[galleryRow], offers];
    mocks.select.mockImplementation(() => chain(queue.shift() ?? []));

    const result = await listClientGalleryOffers(CLIENT_ID, GALLERY_ID);

    expect(result).toEqual({ offers, includedPhotos: 20 });
    const selectedFields = Object.keys(mocks.select.mock.calls[1][0] as Record<string, unknown>);
    expect(selectedFields).toEqual(["productId", "kind", "name", "description", "price"]);
    expect(selectedFields).not.toContain("internalNotes");
  });

  it("offers nothing when the gallery is not the client's published gallery", async () => {
    mocks.select.mockImplementation(() => chain([]));

    await expect(listClientGalleryOffers(CLIENT_ID, GALLERY_ID)).resolves.toEqual({ offers: [], includedPhotos: null });
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });
});
