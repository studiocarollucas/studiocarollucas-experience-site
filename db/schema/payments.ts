import { pgTable, uuid, numeric, timestamp, text, pgEnum } from "drizzle-orm/pg-core";

export const paymentEntryStatusEnum = pgEnum("payment_entry_status", [
  "pendente",
  "confirmado",
  "estornado",
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootId: uuid("shoot_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
  method: text("method"),
  status: paymentEntryStatusEnum("status").notNull().default("pendente"),
  proofUrl: text("proof_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
