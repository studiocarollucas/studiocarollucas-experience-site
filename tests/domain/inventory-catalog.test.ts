// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
    transaction: mocks.transaction,
  },
}));

vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import {
  createInventoryItem,
  deactivateInventoryItem,
  updateInventoryItem,
} from "@/domain/inventory/catalog";

const actorUserId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const item = {
  id: itemId,
  code: "CL-001",
  name: "Clutch dourada",
  description: null,
  type: "clutch",
  color: "dourado",
  size: null,
  status: "available",
  active: true,
  internalPrice: "120.00",
  createdAt: new Date("2030-01-01"),
  updatedAt: new Date("2030-01-01"),
};

function returning(row: unknown) {
  return { returning: vi.fn().mockResolvedValue(row === undefined ? [] : [row]) };
}

function roleResult(role: string | undefined) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(role ? [{ role }] : []) }),
    }),
  };
}

describe("inventory catalog mutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation(async (operation) =>
      operation({ select: mocks.select, insert: mocks.insert, update: mocks.update }),
    );
    mocks.select
      .mockReturnValueOnce(roleResult("staff"))
      .mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      });
    mocks.insert.mockReturnValue({ values: vi.fn().mockReturnValue(returning(item)) });
    mocks.update.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(returning(item)) }),
    });
    mocks.recordAuditEvent.mockResolvedValue({ id: "audit-id" });
  });

  it("creates a validated item and audits the creation in its transaction", async () => {
    await expect(
      createInventoryItem(
        { code: " CL-001 ", name: " Clutch dourada ", type: "clutch", internalPrice: "120.00" },
        actorUserId,
      ),
    ).resolves.toMatchObject({ id: itemId, code: "CL-001" });

    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId,
        action: "inventory_item.created",
        entityType: "inventory_item",
        entityId: itemId,
        before: null,
      }),
      expect.objectContaining({ insert: mocks.insert }),
    );
  });

  it("rejects a duplicate internal code before writing an item", async () => {
    mocks.select.mockReset();
    mocks.select
      .mockReturnValueOnce(roleResult("admin"))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: itemId }]) }),
        }),
      });

    await expect(
      createInventoryItem({ code: "CL-001", name: "Outra clutch", type: "clutch" }, actorUserId),
    ).rejects.toThrow("código já cadastrado");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("updates a catalog item and records before and after values", async () => {
    mocks.select.mockReset();
    mocks.select
      .mockReturnValueOnce(roleResult("staff"))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([item]) }),
        }),
      });
    const updated = { ...item, name: "Clutch dourada lisa", updatedAt: new Date("2030-01-02") };
    mocks.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(returning(updated)) }),
    });

    await expect(updateInventoryItem(itemId, { name: "Clutch dourada lisa" }, actorUserId)).resolves.toMatchObject({
      name: "Clutch dourada lisa",
    });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "inventory_item.updated", before: item, after: updated }),
      expect.anything(),
    );
  });

  it("deactivates instead of deleting and writes an audit event", async () => {
    mocks.select.mockReset();
    mocks.select
      .mockReturnValueOnce(roleResult("staff"))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([item]) }),
        }),
      });
    const inactive = { ...item, active: false };
    mocks.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(returning(inactive)) }),
    });

    await expect(deactivateInventoryItem(itemId, actorUserId)).resolves.toMatchObject({ active: false });
    expect(mocks.update.mock.results[0]?.value.set).toHaveBeenCalledWith(
      expect.objectContaining({ active: false, updatedAt: expect.any(Date) }),
    );
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "inventory_item.deactivated", before: item, after: inactive }),
      expect.anything(),
    );
  });

  it.each(["client", undefined])("rejects a %s or missing actor before catalog mutation", async (role) => {
    mocks.select.mockReset();
    mocks.select.mockReturnValueOnce(roleResult(role));

    await expect(
      createInventoryItem({ code: "CL-001", name: "Clutch dourada", type: "clutch" }, actorUserId),
    ).rejects.toThrow("não autorizado");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
