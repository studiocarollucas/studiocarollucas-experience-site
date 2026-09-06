import { toCents, fromCents } from "@/lib/money";
import { calculateBalance } from "@/domain/payments/balance";

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
const CANCELLED = "cancelado";

export function computeDashboardKpis(input: DashboardInput): DashboardKpis {
  const billedCents = input.shoots.reduce((sum, s) => sum + toCents(s.agreedPrice), 0);

  const confirmedByShoot = new Map<string, number>();
  for (const p of input.payments) {
    if (p.status !== "confirmado") continue;
    confirmedByShoot.set(p.shootId, (confirmedByShoot.get(p.shootId) ?? 0) + toCents(p.amount));
  }
  const receivedCents = [...confirmedByShoot.values()].reduce((a, b) => a + b, 0);

  // A cancelled shoot's outstanding amount is not a receivable — nobody is going to
  // pay it. It stays in `billed`/`shootsInPeriod`, which are faithful "was booked"
  // figures, but must not inflate the money the studio still expects to collect.
  const receivableCents = input.shoots.reduce((sum, s) => {
    if (s.status === CANCELLED) return sum;
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

/**
 * Which shoots still owe money, derived from the payment rows rather than read off
 * the `shoots.payment_status` cache. The cache is only ever written by
 * registerPayment; anything that changes the agreed price, or a payment row edited
 * out of band, leaves it stale, and the dashboard's attention list is exactly where
 * a stale value misleads. Cancelled shoots are never listed.
 */
export function shootsNeedingPayment(
  shoots: { id: string; agreedPrice: string; status: string }[],
  payments: PaymentRow[],
): string[] {
  const byShoot = new Map<string, PaymentRow[]>();
  for (const p of payments) {
    const list = byShoot.get(p.shootId);
    if (list) list.push(p);
    else byShoot.set(p.shootId, [p]);
  }

  return shoots
    .filter((s) => {
      if (s.status === CANCELLED) return false;
      const balance = calculateBalance(s.agreedPrice, byShoot.get(s.id) ?? []);
      // calculateBalance does not clamp: a negative balance is an overpayment, and
      // "0.00" is settled. Only a strictly positive balance is money still owed.
      return !balance.startsWith("-") && balance !== "0.00";
    })
    .map((s) => s.id);
}
