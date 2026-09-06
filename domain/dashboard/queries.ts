import { and, eq, gte, lte, ne, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { shoots, payments, expenses, productionJobs } from "@/db/schema";
import { computeDashboardKpis, shootsNeedingPayment, type DashboardKpis } from "./kpis";

export type AttentionItem = {
  kind: "unpaid" | "delivery_overdue";
  shootId: string;
  label: string;
};

export async function getDashboardData(range: { from: string; to: string }): Promise<{
  kpis: DashboardKpis;
  attention: AttentionItem[];
}> {
  const periodShoots = await db
    .select({
      id: shoots.id,
      agreedPrice: shoots.agreedPrice,
      status: shoots.status,
      shootDate: shoots.shootDate,
    })
    .from(shoots)
    .where(and(gte(shoots.shootDate, range.from), lte(shoots.shootDate, range.to)));

  const shootIds = periodShoots.map((s) => s.id);
  const periodPayments = shootIds.length
    ? await db
        .select({ shootId: payments.shootId, amount: payments.amount, status: payments.status })
        .from(payments)
        .where(inArray(payments.shootId, shootIds))
    : [];

  const periodExpenses = await db
    .select({ amount: expenses.amount })
    .from(expenses)
    .where(and(gte(expenses.date, range.from), lte(expenses.date, range.to)));

  const kpis = computeDashboardKpis({
    shoots: periodShoots,
    payments: periodPayments,
    expenses: periodExpenses,
  });

  const today = new Date().toISOString().slice(0, 10);
  // Joined to shoots so a cancelled shoot's job never shows up as an overdue
  // delivery — there is nothing left to deliver.
  const overdueJobs = await db
    .select({ shootId: productionJobs.shootId, dueAt: productionJobs.deliveryDueAt })
    .from(productionJobs)
    .innerJoin(shoots, eq(productionJobs.shootId, shoots.id))
    .where(
      and(
        lte(productionJobs.deliveryDueAt, today),
        inArray(productionJobs.status, ["aguardando", "iniciado", "parcial", "finalizado"]),
        ne(shoots.status, "cancelado"),
      ),
    );

  kpis.upcomingDeliveries = overdueJobs.length;

  // Derived from the payment rows, not from the shoots.payment_status cache: the
  // cache is only written by registerPayment, so anything else that moves the
  // agreed price or a payment row leaves it stale exactly where it misleads most.
  const needsPayment = new Set(shootsNeedingPayment(periodShoots, periodPayments));

  const attention: AttentionItem[] = [
    ...periodShoots
      .filter((s) => needsPayment.has(s.id))
      .map((s): AttentionItem => ({ kind: "unpaid", shootId: s.id, label: "Pagamento pendente" })),
    ...overdueJobs.map((j): AttentionItem => ({
      kind: "delivery_overdue",
      shootId: j.shootId,
      label: "Entrega vencida",
    })),
  ];

  return { kpis, attention };
}
