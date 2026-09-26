import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// Server-only outbox for automated communication (SCL-700/SCL-705). Both tables
// have RLS enabled with no grants/policies for anon/authenticated (migration
// 0049): only the application's Drizzle connection reads or writes them.

export const notificationChannelValues = ["email"] as const;
export const notificationDeliveryStatusValues = [
  "pending",
  "sending",
  "retry",
  "sent",
  "failed",
  "cancelled",
] as const;

export type NotificationDeliveryStatus = (typeof notificationDeliveryStatusValues)[number];

export const notificationChannelEnum = pgEnum("notification_channel", notificationChannelValues);
export const notificationDeliveryStatusEnum = pgEnum(
  "notification_delivery_status",
  notificationDeliveryStatusValues,
);

export const automationEvents = pgTable(
  "automation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(), // e.g. "shoot.confirmed"
    entityType: text("entity_type").notNull(), // e.g. "shoot"
    entityId: uuid("entity_id").notNull(),
    // Chosen by the caller (e.g. "shoot.confirmed:<shootId>"); replays are no-ops.
    idempotencyKey: text("idempotency_key").notNull().unique("automation_events_idempotency_key_unique"),
    // Non-sensitive references only — never contact data.
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("automation_events_entity_idx").on(table.entityType, table.entityId)],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => automationEvents.id),
    channel: notificationChannelEnum("channel").notNull().default("email"),
    templateKey: text("template_key").notNull(),
    // Pinned at enqueue time so a later copy change never alters a queued message.
    templateVersion: integer("template_version").notNull(),
    // Normalized (trimmed, lower-case) address. Never logged.
    recipient: text("recipient").notNull(),
    templateData: jsonb("template_data").$type<Record<string, unknown>>().notNull(),
    status: notificationDeliveryStatusEnum("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    // Lease of a claimed ("sending") row; an expired lease makes the row claimable again.
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    // Sanitized (no addresses/secrets) and truncated provider/render error.
    lastError: text("last_error"),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("notification_deliveries_event_template_recipient_unique").on(
      table.eventId,
      table.templateKey,
      table.recipient,
    ),
    check(
      "notification_deliveries_attempts_valid",
      sql`${table.attemptCount} >= 0 and ${table.maxAttempts} > 0`,
    ),
    check("notification_deliveries_template_version_positive", sql`${table.templateVersion} > 0`),
    check(
      "notification_deliveries_sent_has_sent_at",
      sql`${table.status} <> 'sent' or ${table.sentAt} is not null`,
    ),
    index("notification_deliveries_due_idx").on(table.status, table.nextAttemptAt),
  ],
);

export type AutomationEvent = typeof automationEvents.$inferSelect;
export type NewAutomationEvent = typeof automationEvents.$inferInsert;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery = typeof notificationDeliveries.$inferInsert;
