// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
  transactionSelect: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  recordAuditEvent: vi.fn(),
  itemFor: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: {
    execute: mocks.execute,
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
    transaction: mocks.transaction,
  },
}));

vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import {
  cancelInventoryReservation,
  canonicalizeInventoryReservationLockId,
  createShootInventoryReservation,
  listReservationsForShoot,
} from "@/domain/inventory/reservations";
import { inventoryItems } from "@/db/schema";

const inventoryItemId = "a0b1c2d3-e4f5-4000-8000-000000000001";
const shootId = "00000000-0000-4000-8000-000000000002";
const actorUserId = "00000000-0000-4000-0000-000000000003";
const reservationId = "00000000-0000-4000-8000-000000000004";

const baseInput = {
  inventoryItemId,
  shootId,
  startsOn: "2030-05-10",
  endsOn: "2030-05-12",
};

function returning(row: unknown) {
  return { returning: vi.fn().mockResolvedValue([row]) };
}

describe("inventory reservations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation(async (operation) =>
      operation({ execute: mocks.execute, select: (...args: unknown[]) => ({ from: (table: unknown) => table === inventoryItems
        ? { where: () => ({ limit: () => ({ for: mocks.itemFor }) }) }
        : mocks.transactionSelect(...args).from(table) }), insert: mocks.insert, update: mocks.update }),
    );
    mocks.itemFor.mockResolvedValue([{ id: inventoryItemId, active: true, status: "available" }]);
    mocks.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: "staff" }]),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    mocks.transactionSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    mocks.insert.mockReturnValue({ values: vi.fn().mockImplementation(() => returning({ id: reservationId, status: "confirmed" })) });
    mocks.update.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockImplementation(() => returning({ id: reservationId, status: "cancelled" })) }),
    });
    mocks.recordAuditEvent.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000005" });
  });

  it.each([
    [{ active: false, status: "available" }],
    [{ active: true, status: "maintenance" }],
    [{ active: true, status: "retired" }],
    [],
  ])("rejects a now ineligible catalog item under a row lock: %j", async (...items) => {
    mocks.itemFor.mockResolvedValue(items);
    await expect(createShootInventoryReservation({ ...baseInput, overrideConflict: true, overrideReason: "Produção aprovou" }, actorUserId)).rejects.toThrow(/item.*indisponível/i);
    expect(mocks.itemFor).toHaveBeenCalledWith("update");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("confirms a non-conflicting shoot reservation and writes its audit event in the transaction", async () => {
    await expect(createShootInventoryReservation(baseInput, actorUserId)).resolves.toMatchObject({ status: "confirmed" });

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.itemFor).toHaveBeenCalledWith("update");
    expect(mocks.itemFor.mock.invocationCallOrder[0]).toBeLessThan(mocks.insert.mock.invocationCallOrder[0]);
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId,
        action: "inventory_reservation.created",
        entityType: "inventory_reservation",
        entityId: reservationId,
      }),
      expect.objectContaining({ insert: mocks.insert }),
    );
  });

  it("uses one advisory lock argument for uppercase and lowercase UUID input containing letters", async () => {
    const lowerCaseLockArgument = canonicalizeInventoryReservationLockId(inventoryItemId);
    const upperCaseLockArgument = canonicalizeInventoryReservationLockId(inventoryItemId.toUpperCase());

    expect(lowerCaseLockArgument).toBe(inventoryItemId);
    expect(upperCaseLockArgument).toBe(lowerCaseLockArgument);
  });

  it("rejects an inclusive pending or confirmed overlap without an explicit override", async () => {
    mocks.transactionSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: reservationId, status: "pending" }]) }),
      }),
    });

    await expect(createShootInventoryReservation({ ...baseInput, startsOn: "2030-05-12", endsOn: "2030-05-14" }, actorUserId)).rejects.toThrow("conflito de reserva");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("requires a justification before an overlapping reservation can be overridden", async () => {
    mocks.transactionSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: reservationId, status: "confirmed" }]) }),
      }),
    });

    await expect(createShootInventoryReservation({ ...baseInput, overrideConflict: true }, actorUserId)).rejects.toThrow("justificativa");
  });

  it("records the approver and reason for an explicitly approved conflict", async () => {
    mocks.transactionSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: reservationId, status: "confirmed" }]) }),
      }),
    });
    mocks.insert.mockReturnValueOnce({
      values: vi.fn().mockImplementation(() =>
        returning({ id: reservationId, status: "confirmed", overriddenByUserId: actorUserId, overrideReason: "Aprovado pela produção" }),
      ),
    });

    await expect(createShootInventoryReservation({ ...baseInput, overrideConflict: true, overrideReason: "Aprovado pela produção" }, actorUserId)).resolves.toMatchObject({ overriddenByUserId: actorUserId });
    const values = mocks.insert.mock.results[0]?.value.values;
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        overrideReason: "Aprovado pela produção",
        overriddenByUserId: actorUserId,
        overriddenAt: expect.any(Date),
      }),
    );
  });

  it("cancels without deleting and writes a cancellation audit event in the transaction", async () => {
    await expect(cancelInventoryReservation(reservationId, actorUserId, shootId)).resolves.toMatchObject({ status: "cancelled" });

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledOnce();
    const values = mocks.update.mock.results[0]?.value.set;
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
        cancelledByUserId: actorUserId,
        cancelledAt: expect.any(Date),
      }),
    );
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "inventory_reservation.cancelled", actorUserId, entityId: reservationId }),
      expect.objectContaining({ update: mocks.update }),
    );
  });

  it.each(["client", undefined])("rejects a %s or missing actor before a reservation mutation", async (role) => {
    mocks.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(role ? [{ role }] : []) }),
      }),
    });

    await expect(createShootInventoryReservation(baseInput, actorUserId)).rejects.toThrow("não autorizado");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it.each(["client", undefined])("rejects a %s or missing actor before a cancellation mutation", async (role) => {
    mocks.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(role ? [{ role }] : []) }),
      }),
    });

    await expect(cancelInventoryReservation(reservationId, actorUserId, shootId)).rejects.toThrow("não autorizado");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("refuses an already cancelled or wrong-shoot reservation without another audit event", async () => {
    mocks.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockImplementation(() => returning(undefined)) }),
    });

    await expect(cancelInventoryReservation(reservationId, actorUserId, shootId)).rejects.toThrow("não cancelável");
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("lists reservations for a shoot without creating a UI read model", async () => {
    const rows = [{ id: reservationId, shootId, status: "confirmed" }];
    mocks.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(rows) }) }),
    });

    await expect(listReservationsForShoot(shootId)).resolves.toEqual(rows);
  });
});
