import { pgTable, uuid, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const preparationTaskStatusEnum = pgEnum("preparation_task_status", [
  "pendente",
  "em_andamento",
  "concluida",
]);

export const preparationTasks = pgTable("preparation_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootId: uuid("shoot_id").notNull(),
  type: text("type").notNull(), // e.g. "moodboard", "figurino", "clutch", "make", "pagamento"
  title: text("title").notNull(),
  status: preparationTaskStatusEnum("status").notNull().default("pendente"),
  // mode: "string" (deviation from the brief's literal timestamp() call, same fix as
  // domain/payments' paidAt in Task 5): Drizzle's default timestamp mode infers as
  // TS `Date`, but domain/preparation/schema.ts treats dueAt/completedAt as
  // z.string().optional() (ISO strings) end-to-end. Without this annotation,
  // `npm run typecheck` fails in domain/preparation/service.ts the same way it did
  // for payments.ts before that fix. DB-behavior-neutral: same Postgres column type
  // (`timestamp with time zone`) either way, no migration diff.
  dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }),
  visibleToClient: boolean("visible_to_client").notNull().default(true),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PreparationTask = typeof preparationTasks.$inferSelect;
export type NewPreparationTask = typeof preparationTasks.$inferInsert;
