import { pgTable, uuid, numeric, date, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const expenseTypeEnum = pgEnum("expense_type", ["custo", "investimento", "funcionario"]);

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  type: expenseTypeEnum("type").notNull(),
  category: text("category"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method"),
  recurring: boolean("recurring").notNull().default(false),
  proofUrl: text("proof_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
