import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id"), // nullable — null means a system/automated action
  action: text("action").notNull(), // e.g. "shoot.status_changed", "payment.created"
  entityType: text("entity_type").notNull(), // e.g. "shoot", "payment", "client"
  entityId: uuid("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
