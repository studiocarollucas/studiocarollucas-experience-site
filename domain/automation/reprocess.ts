import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { notificationDeliveries, type NotificationDelivery } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";

export const DEFAULT_REQUEUE_EXTRA_ATTEMPTS = 3;

const cancellableStatuses = ["pending", "retry"] as const;

type ReprocessInput = {
  deliveryId: string;
  /** Staff member responsible, or null for an operator acting via runbook script. */
  actorUserId: string | null;
};

/**
 * Manual, safe reprocessing: only a `failed` delivery goes back to the queue
 * (never `sent`, `sending` or `cancelled`), with a few extra attempts on top
 * of the ones already spent, due immediately. Audited. Returns null when the
 * delivery does not exist or is not failed. Authorization belongs to the
 * caller (a future defineAdminAction with role "staff").
 */
export async function requeueFailedDelivery(
  input: ReprocessInput & { extraAttempts?: number },
  now: Date = new Date(),
): Promise<NotificationDelivery | null> {
  const extraAttempts = Math.max(1, Math.min(10, Math.floor(input.extraAttempts ?? DEFAULT_REQUEUE_EXTRA_ATTEMPTS)));

  return db.transaction(async (tx) => {
    const [delivery] = await tx
      .update(notificationDeliveries)
      .set({
        status: "retry",
        nextAttemptAt: now,
        maxAttempts: sql`${notificationDeliveries.attemptCount} + ${extraAttempts}`,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(and(eq(notificationDeliveries.id, input.deliveryId), eq(notificationDeliveries.status, "failed")))
      .returning();
    if (!delivery) return null;

    await recordAuditEvent(
      {
        actorUserId: input.actorUserId,
        action: "notification_delivery.requeued",
        entityType: "notification_delivery",
        entityId: delivery.id,
        before: { status: "failed" },
        after: { status: delivery.status, attemptCount: delivery.attemptCount, maxAttempts: delivery.maxAttempts },
      },
      tx,
    );
    return delivery;
  });
}

/** Stops a delivery that has not been handed to the provider yet. Audited. */
export async function cancelDelivery(input: ReprocessInput, now: Date = new Date()): Promise<NotificationDelivery | null> {
  return db.transaction(async (tx) => {
    const [delivery] = await tx
      .update(notificationDeliveries)
      .set({ status: "cancelled", lockedUntil: null, updatedAt: now })
      .where(
        and(eq(notificationDeliveries.id, input.deliveryId), inArray(notificationDeliveries.status, cancellableStatuses)),
      )
      .returning();
    if (!delivery) return null;

    await recordAuditEvent(
      {
        actorUserId: input.actorUserId,
        action: "notification_delivery.cancelled",
        entityType: "notification_delivery",
        entityId: delivery.id,
        after: { status: delivery.status },
      },
      tx,
    );
    return delivery;
  });
}
