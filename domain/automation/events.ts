import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  automationEvents,
  notificationDeliveries,
  type AutomationEvent,
  type NewNotificationDelivery,
  type NotificationDelivery,
} from "@/db/schema";
import { DEFAULT_MAX_ATTEMPTS } from "./retry";
import { getLatestEmailTemplate } from "./templates/registry";

const enqueueAutomationEventSchema = z.object({
  // "<entity>.<fact>", e.g. "shoot.confirmed", "gallery.published".
  eventType: z.string().regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/),
  entityType: z.string().regex(/^[a-z][a-z0-9_]*$/),
  entityId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(1).max(200),
  // Non-sensitive references only; contact data belongs on the delivery.
  payload: z.record(z.string(), z.unknown()).default({}),
  occurredAt: z.date().optional(),
  deliveries: z
    .array(
      z.object({
        templateKey: z.string().min(1),
        recipient: z.string().trim().toLowerCase().max(254).email(),
        data: z.unknown(),
        /** Earliest send time (e.g. D-7 reminders); defaults to now. */
        sendAt: z.date().optional(),
      }),
    )
    .max(50),
});

export type EnqueueAutomationEventInput = z.input<typeof enqueueAutomationEventSchema>;

export type EnqueueAutomationEventResult = {
  /** false when the idempotency key already existed (replay: nothing written). */
  created: boolean;
  event: AutomationEvent;
  deliveries: NotificationDelivery[];
};

/** Accepts `db` or the caller's transaction, so the event commits with the action. */
export type AutomationWriter = Pick<typeof db, "insert" | "select">;

export class AutomationEventKeyConflictError extends Error {
  constructor() {
    super("chave de idempotência já usada por outro evento de automação");
    this.name = "AutomationEventKeyConflictError";
  }
}

/**
 * Persists an automation event and its pending email deliveries. Call it inside
 * the transaction of the business action (`enqueueAutomationEvent(input, tx)`):
 * both commit or roll back together. Replaying the same idempotency key is a
 * no-op that returns what is already stored. Template and data are validated
 * before any write, and the latest template version is pinned per delivery.
 */
export async function enqueueAutomationEvent(
  input: EnqueueAutomationEventInput,
  writer: AutomationWriter = db,
): Promise<EnqueueAutomationEventResult> {
  const parsed = enqueueAutomationEventSchema.parse(input);
  const entityId = parsed.entityId.toLowerCase();

  const seen = new Set<string>();
  const deliveries: Omit<NewNotificationDelivery, "eventId">[] = [];
  for (const delivery of parsed.deliveries) {
    const template = getLatestEmailTemplate(delivery.templateKey);
    const templateData = template.parse(delivery.data);
    const dedupeKey = `${template.key}\u0000${delivery.recipient}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    deliveries.push({
      channel: "email",
      templateKey: template.key,
      templateVersion: template.version,
      recipient: delivery.recipient,
      templateData,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      ...(delivery.sendAt ? { nextAttemptAt: delivery.sendAt } : {}),
    });
  }

  const [created] = await writer
    .insert(automationEvents)
    .values({
      eventType: parsed.eventType,
      entityType: parsed.entityType,
      entityId,
      idempotencyKey: parsed.idempotencyKey,
      payload: parsed.payload,
      ...(parsed.occurredAt ? { occurredAt: parsed.occurredAt } : {}),
    })
    .onConflictDoNothing({ target: automationEvents.idempotencyKey })
    .returning();

  if (!created) {
    const [existing] = await writer
      .select()
      .from(automationEvents)
      .where(eq(automationEvents.idempotencyKey, parsed.idempotencyKey))
      .limit(1);
    if (!existing) throw new Error("evento de automação ausente após conflito de idempotência");
    if (
      existing.eventType !== parsed.eventType ||
      existing.entityType !== parsed.entityType ||
      existing.entityId !== entityId
    ) {
      throw new AutomationEventKeyConflictError();
    }
    const existingDeliveries = await writer
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.eventId, existing.id));
    return { created: false, event: existing, deliveries: existingDeliveries };
  }

  if (deliveries.length === 0) return { created: true, event: created, deliveries: [] };

  const inserted = await writer
    .insert(notificationDeliveries)
    .values(deliveries.map((delivery) => ({ ...delivery, eventId: created.id })))
    .onConflictDoNothing({
      target: [notificationDeliveries.eventId, notificationDeliveries.templateKey, notificationDeliveries.recipient],
    })
    .returning();

  return { created: true, event: created, deliveries: inserted };
}
