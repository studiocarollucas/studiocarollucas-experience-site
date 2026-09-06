import { toCents, fromCents } from "@/lib/money";

type ShootRow = { id: string; agreedPrice: string; status: string; shootDate: string };
type PaymentRow = { shootId: string; amount: string; status: "pendente" | "confirmado" | "estornado" };
type ExpenseRow = { amount: string };

export type DashboardInput = {
  shoots: ShootRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
};

export type DashboardKpis = {
  shootsInPeriod: number;
  billed: string;
  received: string;
  receivable: string;
  expenses: string;
  result: string;
  averageTicket: string;
  productionInProgress: number;
  finishedShoots: number;
  upcomingDeliveries: number;
};

const IN_PROGRESS = new Set(["realizado", "edicao"]);
const FINISHED = new Set(["finalizado", "reveal", "entregue"]);

export function computeDashboardKpis(input: DashboardInput): DashboardKpis {
  const billedCents = input.shoots.reduce((sum, s) => sum + toCents(s.agreedPrice), 0);

  const confirmedByShoot = new Map<string, number>();
  for (const p of input.payments) {
    if (p.status !== "confirmado") continue;
    confirmedByShoot.set(p.shootId, (confirmedByShoot.get(p.shootId) ?? 0) + toCents(p.amount));
  }
  const receivedCents = [...confirmedByShoot.values()].reduce((a, b) => a + b, 0);

  const receivableCents = input.shoots.reduce((sum, s) => {
    const paid = confirmedByShoot.get(s.id) ?? 0;
    const remaining = toCents(s.agreedPrice) - paid;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const expensesCents = input.expenses.reduce((sum, e) => sum + toCents(e.amount), 0);
  const count = input.shoots.length;

  return {
    shootsInPeriod: count,
    billed: fromCents(billedCents),
    received: fromCents(receivedCents),
    receivable: fromCents(receivableCents),
    expenses: fromCents(expensesCents),
    result: fromCents(receivedCents - expensesCents),
    averageTicket: fromCents(count === 0 ? 0 : Math.round(billedCents / count)),
    productionInProgress: input.shoots.filter((s) => IN_PROGRESS.has(s.status)).length,
    finishedShoots: input.shoots.filter((s) => FINISHED.has(s.status)).length,
    upcomingDeliveries: 0, // filled by getDashboardData from production_jobs, not derivable here
  };
}
