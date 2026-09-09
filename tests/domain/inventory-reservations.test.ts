// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  recordAuditEvent: vi.fn(),
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
  createShootInventoryReservation,
  listReservationsForShoot,
} from "@/domain/inventory/reservations";

const inventoryItemId = "00000000-0000-4000-8000-000000000001";
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
      operation({ execute: mocks.execute, select: mocks.select, insert: mocks.insert, update: mocks.update }),
    );
    mocks.select.mockReturnValue({
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

  it("confirms a non-conflicting shoot reservation and writes its audit event in the transaction", async () => {
    await expect(createShootInventoryReservation(baseInput, actorUserId)).resolves.toMatchObject({ status: "confirmed" });

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.execute).toHaveBeenCalledOnce();
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

  it("rejects an inclusive pending or confirmed overlap without an explicit override", async () => {
    mocks.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: reservationId, status: "pending" }]) }),
      }),
    });

    await expect(createShootInventoryReservation({ ...baseInput, startsOn: "2030-05-12", endsOn: "2030-05-14" }, actorUserId)).rejects.toThrow("conflito de reserva");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("requires a justification before an overlapping reservation can be overridden", async () => {
    mocks.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: reservationId, status: "confirmed" }]) }),
      }),
    });

    await expect(createShootInventoryReservation({ ...baseInput, overrideConflict: true }, actorUserId)).rejects.toThrow("justificativa");
  });

  it("records the approver and reason for an explicitly approved conflict", async () => {
    mocks.select.mockReturnValueOnce({
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
    await expect(cancelInventoryReservation(reservationId, actorUserId)).resolves.toMatchObject({ status: "cancelled" });

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

  it("lists reservations for a shoot without creating a UI read model", async () => {
    const rows = [{ id: reservationId, shootId, status: "confirmed" }];
    mocks.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(rows) }) }),
    });

    await expect(listReservationsForShoot(shootId)).resolves.toEqual(rows);
  });
});
