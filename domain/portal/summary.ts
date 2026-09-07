import { calculateBalance, deriveShootPaymentStatus } from "@/domain/payments/balance";
import { addDecimal } from "@/lib/money";

type PreparationInput = {
  id: string;
  title: string;
  status: string;
  clientActionable: boolean;
  visibleToClient: boolean;
  dueAt: string | null;
  createdAt: string;
};

type PaymentInput = {
  amount: string;
  status: "pendente" | "confirmado" | "estornado";
};

function compareIncompleteTasks(left: PreparationInput, right: PreparationInput): number {
  return (
    (left.dueAt ?? "9999-12-31").localeCompare(right.dueAt ?? "9999-12-31") ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export function summarizePortalPreparation(tasks: PreparationInput[]) {
  const visible = tasks.filter((task) => task.visibleToClient);
  const done = visible.filter((task) => task.status === "concluida").length;
  const incomplete = visible.filter((task) => task.status !== "concluida").sort(compareIncompleteTasks);
  const next = incomplete.find((task) => task.clientActionable) ?? incomplete[0] ?? null;

  return {
    total: visible.length,
    done,
    pct: visible.length === 0 ? 0 : Math.round((done / visible.length) * 100),
    nextTask: next ? { id: next.id, title: next.title, actionable: next.clientActionable } : null,
  };
}

export function summarizePortalMoney(agreed: string, payments: PaymentInput[]) {
  const paid = payments
    .filter((payment) => payment.status === "confirmado")
    .reduce((total, payment) => addDecimal(total, payment.amount), "0.00");

  return {
    agreed,
    paid,
    balance: calculateBalance(agreed, payments),
    status: deriveShootPaymentStatus(agreed, payments),
  };
}
