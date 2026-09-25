// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  returning: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import { cancelDelivery, requeueFailedDelivery } from "@/domain/automation/reprocess";

const deliveryId = "00000000-0000-4000-8000-000000000301";
const actorUserId = "00000000-0000-4000-8000-000000000401";
const now = new Date("2030-01-01T12:00:00.000Z");

describe("manual delivery reprocessing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const tx = { update: mocks.update };
    mocks.transaction.mockImplementation(async (operation: (tx: unknown) => unknown) => operation(tx));
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.set.mockReturnValue({ where: () => ({ returning: mocks.returning }) });
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("requeues a failed delivery for immediate retry and audits it in the same transaction", async () => {
    mocks.returning.mockResolvedValue([{ id: deliveryId, status: "retry", attemptCount: 5, maxAttempts: 8 }]);

    await expect(requeueFailedDelivery({ deliveryId, actorUserId }, now)).resolves.toMatchObject({ status: "retry" });

    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "retry", nextAttemptAt: now, lockedUntil: null, updatedAt: now }),
    );
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId,
        action: "notification_delivery.requeued",
        entityType: "notification_delivery",
        entityId: deliveryId,
      }),
      expect.objectContaining({ update: mocks.update }),
    );
  });

  it("returns null and writes no audit when the delivery is not failed (e.g. already sent)", async () => {
    mocks.returning.mockResolvedValue([]);

    await expect(requeueFailedDelivery({ deliveryId, actorUserId }, now)).resolves.toBeNull();
    await expect(cancelDelivery({ deliveryId, actorUserId }, now)).resolves.toBeNull();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("cancels a pending delivery with an audit entry", async () => {
    mocks.returning.mockResolvedValue([{ id: deliveryId, status: "cancelled" }]);

    await expect(cancelDelivery({ deliveryId, actorUserId: null }, now)).resolves.toMatchObject({ status: "cancelled" });
    expect(mocks.set).toHaveBeenCalledWith({ status: "cancelled", lockedUntil: null, updatedAt: now });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, action: "notification_delivery.cancelled" }),
      expect.anything(),
    );
  });
});
