import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const leadStatusEnum = pgEnum("lead_status", [
  "novo",
  "contato",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
]);

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id"), // nullable — PRD: "client_id ou dados temporários do contato"
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  source: text("source").notNull(),
  occasion: text("occasion"),
  quizResult: text("quiz_result"),
  status: leadStatusEnum("status").notNull().default("novo"),
  lostReason: text("lost_reason"),
  owner: uuid("owner"), // references profiles.id, nullable
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
