import { and, gte, lte, eq, inArray, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { payments, expenses, shoots, clients, upsellOrders } from "@/db/schema";
import { calculateBalance } from "@/domain/payments/balance";
import { upsellOrderIsReceivable } from "@/domain/upsell/rules";
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
      upsellOrderId: payments.upsellOrderId,
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
  // confirmed payments, summed over positive per-shoot balances. Upsell receipts
  // (SCL-507) are left out here and counted against their order below.
  const allShoots = await db.select({ id: shoots.id, agreedPrice: shoots.agreedPrice }).from(shoots);
  const shootIds = allShoots.map((s) => s.id);
  const allPayments = shootIds.length
    ? await db
        .select({ shootId: payments.shootId, amount: payments.amount, status: payments.status })
        .from(payments)
        .where(and(inArray(payments.shootId, shootIds), isNull(payments.upsellOrderId)))
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

  // Plus the open balance of every confirmed (not cancelled) upsell order, from
  // the Payment rows linked to it — the same derivation, no stored balance.
  const allOrders = await db
    .select({ id: upsellOrders.id, total: upsellOrders.total, status: upsellOrders.status })
    .from(upsellOrders);
  const receivableOrders = allOrders.filter((order) => upsellOrderIsReceivable(order.status));
  const orderPayments = receivableOrders.length
    ? await db
        .select({ upsellOrderId: payments.upsellOrderId, amount: payments.amount, status: payments.status })
        .from(payments)
        .where(isNotNull(payments.upsellOrderId))
    : [];
  const paymentsByOrder = new Map<string, { amount: string; status: "pendente" | "confirmado" | "estornado" }[]>();
  for (const p of orderPayments) {
    if (!p.upsellOrderId) continue;
    const list = paymentsByOrder.get(p.upsellOrderId) ?? [];
    list.push({ amount: p.amount, status: p.status });
    paymentsByOrder.set(p.upsellOrderId, list);
  }
  for (const order of receivableOrders) {
    const bal = calculateBalance(order.total, paymentsByOrder.get(order.id) ?? []);
    if (!bal.startsWith("-") && bal !== "0.00") {
      openReceivableCents += toCents(bal);
    }
  }
  const openReceivable = fromCents(openReceivableCents);

  return buildLedger({ payments: paymentRows, expenses: expenseRows, openReceivable });
}
