import "server-only";

import { and, asc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { notificationDeliveries } from "@/db/schema";
import type { DeliveryStore } from "./processor";

const claimableStatuses = ["pending", "retry"] as const;

function ownsClaim(id: string, attemptCount: number) {
  return and(
    eq(notificationDeliveries.id, id),
    eq(notificationDeliveries.status, "sending"),
    eq(notificationDeliveries.attemptCount, attemptCount),
  );
}

/** Postgres-backed store; safe to run from concurrent cron invocations. */
export function createDrizzleDeliveryStore(database: typeof db = db): DeliveryStore {
  return {
    async failExhaustedLeases(now) {
      const rows = await database
        .update(notificationDeliveries)
        .set({
          status: "failed",
          lockedUntil: null,
          lastError: "lease expirou sem confirmação após a última tentativa",
          updatedAt: now,
        })
        .where(
          and(
            eq(notificationDeliveries.status, "sending"),
            lt(notificationDeliveries.lockedUntil, now),
            gte(notificationDeliveries.attemptCount, notificationDeliveries.maxAttempts),
          ),
        )
        .returning({ id: notificationDeliveries.id });
      return rows.length;
    },

    async claimDue({ now, limit, leaseMs }) {
      return database.transaction(async (tx) => {
        // SKIP LOCKED: concurrent runs each take a disjoint batch instead of
        // blocking on, or double-claiming, the same rows.
        const due = await tx
          .select({ id: notificationDeliveries.id })
          .from(notificationDeliveries)
          .where(
            and(
              lt(notificationDeliveries.attemptCount, notificationDeliveries.maxAttempts),
              or(
                and(
                  inArray(notificationDeliveries.status, claimableStatuses),
                  lte(notificationDeliveries.nextAttemptAt, now),
                ),
                // A crashed run leaves `sending` behind; reclaim it once the lease ends.
                and(eq(notificationDeliveries.status, "sending"), lt(notificationDeliveries.lockedUntil, now)),
              ),
            ),
          )
          .orderBy(asc(notificationDeliveries.nextAttemptAt))
          .limit(limit)
          .for("update", { skipLocked: true });

        if (due.length === 0) return [];

        return tx
          .update(notificationDeliveries)
          .set({
            status: "sending",
            attemptCount: sql`${notificationDeliveries.attemptCount} + 1`,
            lockedUntil: new Date(now.getTime() + leaseMs),
            lastAttemptAt: now,
            updatedAt: now,
          })
          .where(
            inArray(
              notificationDeliveries.id,
              due.map((row) => row.id),
            ),
          )
          .returning({
            id: notificationDeliveries.id,
            eventId: notificationDeliveries.eventId,
            templateKey: notificationDeliveries.templateKey,
            templateVersion: notificationDeliveries.templateVersion,
            recipient: notificationDeliveries.recipient,
            templateData: notificationDeliveries.templateData,
            attemptCount: notificationDeliveries.attemptCount,
            maxAttempts: notificationDeliveries.maxAttempts,
          });
      });
    },

    async markSent({ id, attemptCount, provider, providerMessageId, now }) {
      const rows = await database
        .update(notificationDeliveries)
        .set({
          status: "sent",
          sentAt: now,
          provider,
          providerMessageId,
          lockedUntil: null,
          lastError: null,
          updatedAt: now,
        })
        .where(ownsClaim(id, attemptCount))
        .returning({ id: notificationDeliveries.id });
      return rows.length > 0;
    },

    async markRetry({ id, attemptCount, nextAttemptAt, error, now }) {
      const rows = await database
        .update(notificationDeliveries)
        .set({ status: "retry", nextAttemptAt, lockedUntil: null, lastError: error, updatedAt: now })
        .where(ownsClaim(id, attemptCount))
        .returning({ id: notificationDeliveries.id });
      return rows.length > 0;
    },

    async markFailed({ id, attemptCount, error, now }) {
      const rows = await database
        .update(notificationDeliveries)
        .set({ status: "failed", lockedUntil: null, lastError: error, updatedAt: now })
        .where(ownsClaim(id, attemptCount))
        .returning({ id: notificationDeliveries.id });
      return rows.length > 0;
    },

    async markCancelled({ id, attemptCount, reason, now }) {
      // `last_error` keeps the (non-personal) reason the guard gave, for the runbook queries.
      const rows = await database
        .update(notificationDeliveries)
        .set({ status: "cancelled", lockedUntil: null, lastError: reason, updatedAt: now })
        .where(ownsClaim(id, attemptCount))
        .returning({ id: notificationDeliveries.id });
      return rows.length > 0;
    },
  };
}
