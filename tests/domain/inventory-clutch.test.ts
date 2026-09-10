// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  transactionSelect: vi.fn(),
  update: vi.fn(),
  recordAuditEvent: vi.fn(),
  itemFor: vi.fn(),
  execute: vi.fn(),
  publishedFor: vi.fn(),
  itemWhere: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
    update: mocks.update,
  },
}));

vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import { inventoryItems } from "@/db/schema";
import { updatePaixaoClutchSchema } from "@/domain/inventory/clutch-schema";
import { listPaixaoClutchForAdmin, updatePaixaoClutch, reorderPaixaoClutch } from "@/domain/inventory/clutch";

const actorUserId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const baseInput = {
  itemId,
  rentalPrice: "120.00",
  replacementValue: "600.00",
  copy: "Uma clutch dourada para produções especiais.",
  publicImagePath: "/images/paixao-clutch/dourada.webp",
  published: true,
  featured: true,
};
const clutch = {
  id: itemId,
  code: "CL-001",
  name: "Clutch dourada",
  type: "clutch",
  status: "available",
  active: true,
  rentalPrice: null,
  replacementValue: null,
  paixaoClutchCopy: null,
  paixaoClutchPublicImagePath: null,
  paixaoClutchPublished: false,
  paixaoClutchFeatured: false,
  paixaoClutchSortOrder: 0,
  createdAt: new Date("2030-01-01"),
  updatedAt: new Date("2030-01-01"),
};

function roleResult(role: string | undefined) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(role ? [{ role }] : []) }),
    }),
  };
}

function returning(row: unknown) {
  return { returning: vi.fn().mockResolvedValue(row === undefined ? [] : [row]) };
}

describe("Paixão Clutch curation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.select.mockReturnValue(roleResult("staff"));
    mocks.transaction.mockImplementation(async (operation) =>
      operation({
        execute: mocks.execute,
        select: (...args: unknown[]) => ({
          from: (table: unknown) => table === inventoryItems
            ? { where: mocks.itemWhere }
            : mocks.transactionSelect(...args).from(table),
        }),
        update: mocks.update,
      }),
    );
    mocks.itemFor.mockResolvedValue([clutch]);
    mocks.itemWhere.mockReturnValue({ limit: () => ({ for: mocks.itemFor }), orderBy: () => ({ for: mocks.publishedFor }) });
    mocks.execute.mockResolvedValue([]);
    mocks.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(returning({ ...clutch, ...baseInput, id: itemId })),
      }),
    });
    mocks.recordAuditEvent.mockResolvedValue({ id: "audit-id" });
  });

  it("accepts bounded commercial and editorial values and rejects a negative money value", () => {
    expect(updatePaixaoClutchSchema.safeParse(baseInput).success).toBe(true);
    expect(updatePaixaoClutchSchema.safeParse({ ...baseInput, rentalPrice: "-1" }).success).toBe(false);
    expect(updatePaixaoClutchSchema.safeParse({ ...baseInput, sortOrder: -1 }).success).toBe(false);
  });

  it("locks an eligible clutch, updates its curation, and audits before and after in the transaction", async () => {
    await expect(updatePaixaoClutch(baseInput, actorUserId)).resolves.toMatchObject({
      id: itemId,
      rentalPrice: "120.00",
      replacementValue: "600.00",
    });

    expect(mocks.itemFor).toHaveBeenCalledWith("update");
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(mocks.execute.mock.invocationCallOrder[0]).toBeLessThan(mocks.itemFor.mock.invocationCallOrder[0]);
    expect(mocks.update.mock.results[0].value.set.mock.calls[0][0]).not.toHaveProperty("paixaoClutchSortOrder");
    expect(mocks.update.mock.results[0]?.value.set).toHaveBeenCalledWith(
      expect.objectContaining({
        rentalPrice: "120.00",
        replacementValue: "600.00",
        paixaoClutchCopy: baseInput.copy,
        paixaoClutchPublicImagePath: baseInput.publicImagePath,
        paixaoClutchPublished: true,
        paixaoClutchFeatured: true,
        updatedAt: expect.any(Date),
      }),
    );
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId,
        action: "inventory_item.paixao_clutch_updated",
        entityType: "inventory_item",
        entityId: itemId,
        before: clutch,
        after: expect.objectContaining({ id: itemId }),
      }),
      expect.objectContaining({ update: mocks.update }),
    );
  });

  it("rejects individual sort-order writes, including for unpublished items", () => {
    expect(updatePaixaoClutchSchema.safeParse({ ...baseInput, published: false, sortOrder: 3 }).success).toBe(false);
  });

  it.each([
    "inventory-media/private/cover.jpg",
    "/admin/acervo/private.jpg",
    "https://example.test/storage/v1/object/sign/inventory-media/a.jpg?token=secret",
    "https://example.test/photo.jpg",
    "//example.test/photo.jpg",
    "/images/paixao-clutch/../private.jpg",
    "/images/paixao-clutch/%2e%2e/private.jpg",
    "/images/paixao-clutch/cover.jpg?token=secret",
    "/images/paixao-clutch/cover.jpg#fragment",
    "/images/paixao-clutch/cover.svg",
    "/images/paixao-clutch/a\\private.jpg",
    "data:image/png;base64,AAAA",
  ])("rejects unsafe public image references: %s", async (publicImagePath) => {
    expect(updatePaixaoClutchSchema.shape.publicImagePath.safeParse(publicImagePath).success).toBe(false);
    await expect(updatePaixaoClutch({ ...baseInput, publicImagePath }, actorUserId)).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("reorders the complete published collection under a lock and audits each item in one transaction", async () => {
    const secondId = "00000000-0000-4000-8000-000000000004";
    const published = [{ ...clutch, paixaoClutchPublished: true }, { ...clutch, id: secondId, paixaoClutchPublished: true }];
    mocks.publishedFor.mockResolvedValue(published);
    await reorderPaixaoClutch({ itemIds: [secondId, itemId] }, actorUserId);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(mocks.publishedFor).toHaveBeenCalledWith("update");
    const predicate = new PgDialect().sqlToQuery(mocks.itemWhere.mock.calls[0][0]);
    expect(predicate.sql).toContain('"inventory_items"."type"');
    expect(predicate.sql).toContain('"inventory_items"."paixao_clutch_published"');
    expect(predicate.params).toEqual(["clutch", true]);
    expect(mocks.execute.mock.invocationCallOrder[0]).toBeLessThan(mocks.publishedFor.mock.invocationCallOrder[0]);
    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.update.mock.results[0].value.set).toHaveBeenNthCalledWith(1, expect.objectContaining({ paixaoClutchSortOrder: 0 }));
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId, action: "inventory_item.paixao_clutch_reordered", entityId: secondId,
      before: published[1], after: expect.objectContaining({ id: secondId, paixaoClutchSortOrder: 0 }),
    }), expect.objectContaining({ update: mocks.update }));
    expect(mocks.recordAuditEvent).toHaveBeenCalledTimes(2);
    expect(mocks.update.mock.results[0].value.set).toHaveBeenNthCalledWith(2, expect.objectContaining({ paixaoClutchSortOrder: 1 }));
  });

  it.each([[], [itemId, itemId], ["00000000-0000-4000-8000-000000000099"]])("rejects missing, duplicate, or unpublished members: %j", async (...itemIds) => {
    mocks.publishedFor.mockResolvedValue([{ ...clutch, paixaoClutchPublished: true }]);
    await expect(reorderPaixaoClutch({ itemIds }, actorUserId)).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it.each(["client", undefined])("rejects a %s actor before reordering", async (role) => {
    mocks.select.mockReturnValueOnce(roleResult(role));
    await expect(reorderPaixaoClutch({ itemIds: [itemId] }, actorUserId)).rejects.toThrow("não autorizado");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("aborts the reorder transaction if auditing fails", async () => {
    mocks.publishedFor.mockResolvedValue([{ ...clutch, paixaoClutchPublished: true }]);
    mocks.recordAuditEvent.mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(reorderPaixaoClutch({ itemIds: [itemId] }, actorUserId)).rejects.toThrow("audit unavailable");
  });

  it.each([
    [{ ...clutch, type: "accessory" }],
    [{ ...clutch, active: false }],
    [{ ...clutch, status: "maintenance" }],
    [],
  ])("refuses to publish a non-curatable item under the lock: %j", async (...items) => {
    mocks.itemFor.mockResolvedValue(items);

    await expect(updatePaixaoClutch(baseInput, actorUserId)).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it.each([
    ["rentalPrice"],
    ["copy"],
    ["publicImagePath"],
  ] as const)("requires %s before publication", async (missingField) => {
    const input = { ...baseInput, [missingField]: undefined };

    await expect(updatePaixaoClutch(input, actorUserId)).rejects.toThrow(/publica/i);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it.each(["client", undefined])("rejects a %s actor before a curation mutation", async (role) => {
    mocks.select.mockReturnValueOnce(roleResult(role));

    await expect(updatePaixaoClutch(baseInput, actorUserId)).rejects.toThrow("não autorizado");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("lists only clutch curation rows for staff, including administrative replacement value", async () => {
    const rows = [{ ...clutch, rentalPrice: "120.00", replacementValue: "600.00" }];
    mocks.select
      .mockReturnValueOnce(roleResult("admin"))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(rows) }),
        }),
      });

    await expect(listPaixaoClutchForAdmin({ published: true }, actorUserId)).resolves.toEqual(rows);
  });
});
