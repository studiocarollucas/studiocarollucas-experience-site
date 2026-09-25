// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { automationEvents, notificationDeliveries } from "@/db/schema";
import { enqueueAutomationEvent } from "@/domain/automation/events";

// Live-DB tests are opt-in (RUN_LIVE_DB_TESTS=true), never armed by DATABASE_URL
// alone. They expect migration 0049 applied to a dev/staging project. The
// processor is deliberately not exercised here: claiming would touch any other
// due delivery in that database.
const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("automation outbox (live database)", () => {
  const entityId = "00000000-0000-4000-8000-0000000007a0";
  const idempotencyKey = `test.scl705:${entityId}:${Date.now()}`;
  const eventIds: string[] = [];

  afterAll(async () => {
    if (eventIds.length === 0) return;
    await db.delete(notificationDeliveries).where(inArray(notificationDeliveries.eventId, eventIds));
    await db.delete(automationEvents).where(inArray(automationEvents.id, eventIds));
  });

  it("enqueues inside a transaction and turns replays into no-ops", async () => {
    const input = {
      eventType: "test.enqueued",
      entityType: "test",
      entityId,
      idempotencyKey,
      deliveries: [{ templateKey: "boas-vindas", recipient: "live-test@example.invalid", data: { firstName: "Teste" } }],
    };

    const first = await db.transaction((tx) => enqueueAutomationEvent(input, tx));
    eventIds.push(first.event.id);
    const replay = await db.transaction((tx) => enqueueAutomationEvent(input, tx));

    expect(first).toMatchObject({ created: true });
    expect(first.deliveries).toHaveLength(1);
    expect(first.deliveries[0]).toMatchObject({ status: "pending", attemptCount: 0, templateVersion: 1 });
    expect(replay).toMatchObject({ created: false, event: { id: first.event.id } });
    expect(replay.deliveries.map((delivery) => delivery.id)).toEqual(first.deliveries.map((delivery) => delivery.id));
  });

  it("rolls the event back with the caller's transaction", async () => {
    const rolledBackKey = `${idempotencyKey}:rollback`;
    await expect(
      db.transaction(async (tx) => {
        await enqueueAutomationEvent(
          { eventType: "test.enqueued", entityType: "test", entityId, idempotencyKey: rolledBackKey, deliveries: [] },
          tx,
        );
        throw new Error("business action failed");
      }),
    ).rejects.toThrow("business action failed");

    const rows = await db.select().from(automationEvents).where(inArray(automationEvents.idempotencyKey, [rolledBackKey]));
    expect(rows).toHaveLength(0);
  });
});
