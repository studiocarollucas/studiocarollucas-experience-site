// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { PortalReference } from "@/domain/portal/types";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(), transaction: vi.fn(), execute: vi.fn(), update: vi.fn(),
  audit: vi.fn(), referenceRows: [] as unknown[], reservationRows: [] as unknown[],
  readRows: [] as unknown[], predicates: [] as unknown[], locks: [] as unknown[], set: vi.fn(),
}));
vi.mock("@/domain/inventory/reservations", () => ({
  requireInventoryReservationActor: mocks.authorize,
  canonicalizeInventoryReservationLockId: (id: string) => id.toLowerCase(),
}));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.audit }));
vi.mock("@/db/client", () => ({ db: {
  transaction: mocks.transaction,
  select: () => {
    const query = {
      from: () => query, innerJoin: () => query,
      where: (predicate: unknown) => { mocks.predicates.push(predicate); return Promise.resolve(mocks.readRows); },
    };
    return query;
  },
} }));
import { stylingReferences } from "@/db/schema";
import { linkStylingReferenceToInventoryItem, readStylingInventoryLinks } from "@/domain/styling/inventory-links";

const shootId = "00000000-0000-4000-8000-000000000001";
const referenceId = "00000000-0000-4000-8000-000000000002";
const inventoryItemId = "00000000-0000-4000-8000-000000000003";
const actorId = "00000000-0000-4000-8000-000000000004";
const input = { shootId, referenceId, inventoryItemId };
const reference: PortalReference = {
  id: referenceId, shootId, storagePath: "private/path", signedUrl: "https://private.test/image",
  caption: "Luz suave", origin: "client", uploadedByAuthUserId: actorId, createdAt: "2026-10-07",
};
let transaction: object;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.predicates = [];
  mocks.locks = [];
  mocks.referenceRows = [{ id: referenceId, shootId, inventoryItemId: null }];
  mocks.reservationRows = [{ id: "reservation-1", shootId, inventoryItemId, purpose: "shoot", status: "pending" }];
  mocks.readRows = [];
  mocks.authorize.mockResolvedValue(undefined);
  mocks.set.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  mocks.update.mockReturnValue({ set: mocks.set });
  transaction = {
    execute: mocks.execute, update: mocks.update,
    select: () => ({ from: (table: unknown) => ({ where: (predicate: unknown) => {
      mocks.predicates.push(predicate);
      return { limit: () => ({ for: vi.fn().mockImplementation(async (strength: unknown) => {
        mocks.locks.push({ table, strength });
        return table === stylingReferences ? mocks.referenceRows : mocks.reservationRows;
      }) }) };
    } }) }),
  };
  mocks.transaction.mockImplementation(async (fn) => fn(transaction));
});

describe("styling inventory links", () => {
  it.each(["pending", "confirmed"])("links a %s shoot reservation and audits within the transaction", async (status) => {
    mocks.reservationRows = [{ id: "r", shootId, inventoryItemId, purpose: "shoot", status }];
    await linkStylingReferenceToInventoryItem(input, actorId);
    expect(mocks.authorize).toHaveBeenCalledWith(actorId);
    expect(mocks.set).toHaveBeenCalledWith({ inventoryItemId });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: actorId, action: "styling_reference.linked", entityId: referenceId,
      before: { inventoryItemId: null }, after: { inventoryItemId },
    }), transaction);
    const queries = mocks.predicates.map((p) => new PgDialect().sqlToQuery(p as Parameters<PgDialect["sqlToQuery"]>[0]));
    expect(queries[1].params).toEqual(expect.arrayContaining([shootId, inventoryItemId, "shoot", "pending", "confirmed"]));
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.locks).toHaveLength(2);
    expect(mocks.locks.every((lock) => (lock as { strength: string }).strength === "update")).toBe(true);
  });

  it.each([
    { rows: [] }, { rows: [{ id: "r", shootId, inventoryItemId, purpose: "shoot", status: "cancelled" }] },
    { rows: [{ id: "r", shootId: actorId, inventoryItemId, purpose: "shoot", status: "confirmed" }] },
    { rows: [{ id: "r", shootId, inventoryItemId, purpose: "rental", status: "confirmed" }] },
    { rows: [{ id: "r", shootId, inventoryItemId: actorId, purpose: "shoot", status: "confirmed" }] },
  ])("rejects a missing, cancelled, other-shoot, rental or other-item reservation: $rows", async ({ rows }) => {
    mocks.reservationRows = rows;
    await expect(linkStylingReferenceToInventoryItem(input, actorId)).rejects.toThrow(/reserva/i);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("rejects a reference owned by another shoot", async () => {
    mocks.referenceRows = [{ id: referenceId, shootId: actorId, inventoryItemId: null }];
    await expect(linkStylingReferenceToInventoryItem(input, actorId)).rejects.toThrow(/referência/i);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects a client actor before opening the transaction", async () => {
    mocks.authorize.mockRejectedValueOnce(new Error("ator não autorizado"));
    await expect(linkStylingReferenceToInventoryItem(input, actorId)).rejects.toThrow(/autorizado/);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("removes a stale link without requiring an active reservation", async () => {
    mocks.referenceRows = [{ id: referenceId, shootId, inventoryItemId }];
    mocks.reservationRows = [];
    await linkStylingReferenceToInventoryItem({ ...input, inventoryItemId: null }, actorId);
    expect(mocks.set).toHaveBeenCalledWith({ inventoryItemId: null });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "styling_reference.unlinked" }), transaction);
  });

  it("does not repeat audit events for an unchanged link", async () => {
    mocks.referenceRows = [{ id: referenceId, shootId, inventoryItemId }];
    await linkStylingReferenceToInventoryItem(input, actorId);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("does not audit removing an already empty link", async () => {
    await linkStylingReferenceToInventoryItem({ ...input, inventoryItemId: null }, actorId);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("revalidates a stale unchanged link before treating it as idempotent", async () => {
    mocks.referenceRows = [{ id: referenceId, shootId, inventoryItemId }];
    mocks.reservationRows = [];
    await expect(linkStylingReferenceToInventoryItem(input, actorId)).rejects.toThrow(/reserva/i);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("projects only the piece identity/state for an authorized reference", async () => {
    mocks.readRows = [{ referenceId, shootId, inventoryItemId, itemName: "Vestido rosé", reservationState: "confirmed", internalPrice: "1000", guestPhone: "secret" }];
    const result = await readStylingInventoryLinks(shootId, [reference]);
    expect(result).toEqual([{ ...reference, inventoryLink: { inventoryItemId, itemName: "Vestido rosé", reservationState: "confirmed" } }]);
    expect(JSON.stringify(result)).not.toContain("secret");
    const query = new PgDialect().sqlToQuery(mocks.predicates[0] as Parameters<PgDialect["sqlToQuery"]>[0]);
    expect(query.params).toEqual(expect.arrayContaining([shootId, referenceId, "shoot", "pending", "confirmed"]));
  });

  it("prefers a confirmed reservation when multiple active reservations refer to the same piece", async () => {
    mocks.readRows = [
      { referenceId, shootId, inventoryItemId, itemName: "Vestido rosé", reservationState: "confirmed" },
      { referenceId, shootId, inventoryItemId, itemName: "Vestido rosé", reservationState: "pending" },
    ];
    expect(await readStylingInventoryLinks(shootId, [reference])).toEqual([{ ...reference, inventoryLink: { inventoryItemId, itemName: "Vestido rosé", reservationState: "confirmed" } }]);
  });

  it("does not expose stale links or links for another shoot/reference", async () => {
    mocks.readRows = [{ referenceId, shootId: actorId, inventoryItemId, itemName: "Other", reservationState: "confirmed" }];
    expect(await readStylingInventoryLinks(shootId, [reference])).toEqual([{ ...reference, inventoryLink: null }]);
    mocks.readRows = [{ referenceId, shootId, inventoryItemId, itemName: "Cancelled", reservationState: "cancelled" }];
    expect(await readStylingInventoryLinks(shootId, [reference])).toEqual([{ ...reference, inventoryLink: null }]);
    mocks.readRows = [{ referenceId: actorId, shootId, inventoryItemId, itemName: "Unrequested", reservationState: "pending" }];
    expect(await readStylingInventoryLinks(shootId, [reference])).toEqual([{ ...reference, inventoryLink: null }]);
  });

  it("skips privileged reads for references outside the authorized shoot", async () => {
    expect(await readStylingInventoryLinks(shootId, [{ ...reference, shootId: actorId }])).toEqual([{ ...reference, shootId: actorId, inventoryLink: null }]);
    expect(mocks.predicates).toEqual([]);
  });

  it("skips privileged reads for an empty moodboard", async () => {
    expect(await readStylingInventoryLinks(shootId, [])).toEqual([]);
    expect(mocks.predicates).toEqual([]);
  });
});
