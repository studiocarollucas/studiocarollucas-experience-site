import { and, gte, lte, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { expenses } from "@/db/schema";

export type ExpenseListRow = {
  id: string;
  date: string;
  type: string;
  category: string | null;
  amount: string;
  method: string | null;
  recurring: boolean;
};

export async function listExpenses(range: { from: string; to: string }): Promise<ExpenseListRow[]> {
  return db
    .select({
      id: expenses.id,
      date: expenses.date,
      type: expenses.type,
      category: expenses.category,
      amount: expenses.amount,
      method: expenses.method,
      recurring: expenses.recurring,
    })
    .from(expenses)
    .where(and(gte(expenses.date, range.from), lte(expenses.date, range.to)))
    .orderBy(desc(expenses.date));
}
