import { pgTable, uuid, integer, date, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const productionJobStatusEnum = pgEnum("production_job_status", [
  "aguardando",
  "iniciado",
  "parcial",
  "finalizado",
  "entregue",
]);

export const productionJobs = pgTable("production_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootId: uuid("shoot_id").notNull().unique(), // 1:1 with Shoot
  status: productionJobStatusEnum("status").notNull().default("aguardando"),
  editorUserId: uuid("editor_user_id"),
  photosToEdit: integer("photos_to_edit"),
  deliveryDueAt: date("delivery_due_at"),
  deliveryAt: date("delivery_at"),
  selectionStatus: text("selection_status"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductionJob = typeof productionJobs.$inferSelect;
export type NewProductionJob = typeof productionJobs.$inferInsert;
