import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import {
  automationEvents,
  notificationChannelValues,
  notificationDeliveries,
  notificationDeliveryStatusValues,
} from "@/db/schema";

describe("automation outbox schema", () => {
  it("models automation events with a unique caller-provided idempotency key", () => {
    const columns = getTableColumns(automationEvents);
    expect(Object.keys(columns)).toEqual([
      "id",
      "eventType",
      "entityType",
      "entityId",
      "idempotencyKey",
      "payload",
      "occurredAt",
      "createdAt",
    ]);
    expect(columns.idempotencyKey.isUnique).toBe(true);
  });

  it("models deliveries with status, attempts, schedule and sanitized error", () => {
    expect(notificationChannelValues).toEqual(["email"]);
    expect(notificationDeliveryStatusValues).toEqual(["pending", "sending", "retry", "sent", "failed", "cancelled"]);
    expect(Object.keys(getTableColumns(notificationDeliveries))).toEqual([
      "id",
      "eventId",
      "channel",
      "templateKey",
      "templateVersion",
      "recipient",
      "templateData",
      "status",
      "attemptCount",
      "maxAttempts",
      "nextAttemptAt",
      "lockedUntil",
      "lastAttemptAt",
      "lastError",
      "provider",
      "providerMessageId",
      "sentAt",
      "createdAt",
      "updatedAt",
    ]);
  });
});
