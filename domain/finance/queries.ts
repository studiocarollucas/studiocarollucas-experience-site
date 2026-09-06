import { and, gte, lte, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { payments, expenses, shoots, clients } from "@/db/schema";
import { calculateBalance } from "@/domain/payments/balance";
import { toCents, fromCents } from "@/lib/money";
import { buildLedger, type LedgerEntry, type LedgerSummary } from "./ledger";

export async function getFinancialLedger(range: { from: string; to: string }): Promise<{
  entries: LedgerEntry[];
  summary: LedgerSummary;
}> {
  const paymentRows = await db
    .select({
      paidAt: sql<string | null>`${payments.paidAt}::text`,
      createdAt: sql<string>`${payments.createdAt}::text`,
      amount: payments.amount,
      status: payments.status,
      clientName: clients.name,
    })
    .from(payments)
    .innerJoin(shoots, eq(payments.shootId, shoots.id))
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .where(
      and(
        gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, range.from),
        lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, `${range.to}T23:59:59Z`),
      ),
    );

  const expenseRows = await db
    .select({ date: expenses.date, category: expenses.category, type: expenses.type, amount: expenses.amount })
    .from(expenses)
    .where(and(gte(expenses.date, range.from), lte(expenses.date, range.to)));

  // Open receivable across ALL shoots (not period-limited): agreed price minus
  // confirmed payments, summed over positive per-shoot balances.
  const allShoots = await db.select({ id: shoots.id, agreedPrice: shoots.agreedPrice }).from(shoots);
  const shootIds = allShoots.map((s) => s.id);
  const allPayments = shootIds.length
    ? await db
        .select({ shootId: payments.shootId, amount: payments.amount, status: payments.status })
        .from(payments)
        .where(inArray(payments.shootId, shootIds))
    : [];
  const paymentsByShoot = new Map<string, { amount: string; status: "pendente" | "confirmado" | "estornado" }[]>();
  for (const p of allPayments) {
    const list = paymentsByShoot.get(p.shootId) ?? [];
    list.push({ amount: p.amount, status: p.status });
    paymentsByShoot.set(p.shootId, list);
  }
  let openReceivableCents = 0;
  for (const s of allShoots) {
    const bal = calculateBalance(s.agreedPrice, paymentsByShoot.get(s.id) ?? []);
    if (!bal.startsWith("-") && bal !== "0.00") {
      openReceivableCents += toCents(bal);
    }
  }
  const openReceivable = fromCents(openReceivableCents);

  return buildLedger({ payments: paymentRows, expenses: expenseRows, openReceivable });
}
