import { and, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { shoots, payments, expenses, productionJobs } from "@/db/schema";
import { computeDashboardKpis, type DashboardKpis } from "./kpis";

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
      paymentStatus: shoots.paymentStatus,
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
    shoots: periodShoots.map((s) => ({
      id: s.id,
      agreedPrice: s.agreedPrice,
      status: s.status,
      shootDate: s.shootDate,
    })),
    payments: periodPayments,
    expenses: periodExpenses,
  });

  const today = new Date().toISOString().slice(0, 10);
  const overdueJobs = await db
    .select({ shootId: productionJobs.shootId, dueAt: productionJobs.deliveryDueAt })
    .from(productionJobs)
    .where(
      and(
        lte(productionJobs.deliveryDueAt, today),
        inArray(productionJobs.status, ["aguardando", "iniciado", "parcial", "finalizado"]),
      ),
    );

  kpis.upcomingDeliveries = overdueJobs.length;

  const attention: AttentionItem[] = [
    ...periodShoots
      .filter((s) => s.paymentStatus === "nao_iniciado" || s.paymentStatus === "parcial")
      .map((s): AttentionItem => ({ kind: "unpaid", shootId: s.id, label: "Pagamento pendente" })),
    ...overdueJobs.map((j): AttentionItem => ({
      kind: "delivery_overdue",
      shootId: j.shootId,
      label: "Entrega vencida",
    })),
  ];

  return { kpis, attention };
}
