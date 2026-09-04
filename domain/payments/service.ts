import { db } from "@/db/client";
import { payments, expenses, type Payment, type Expense } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPaymentSchema, createExpenseSchema, type CreatePaymentInput, type CreateExpenseInput } from "./schema";

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const parsed = createPaymentSchema.parse(input);
  const [row] = await db.insert(payments).values(parsed).returning();
  return row;
}

export async function getPaymentsByShootId(shootId: string): Promise<Payment[]> {
  return db.select().from(payments).where(eq(payments.shootId, shootId));
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const parsed = createExpenseSchema.parse(input);
  const [row] = await db.insert(expenses).values(parsed).returning();
  return row;
}
