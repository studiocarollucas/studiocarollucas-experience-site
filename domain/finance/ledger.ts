import { toCents, fromCents } from "@/lib/money";

export type LedgerEntry = {
  id: string;
  date: string;
  kind: "recebimento" | "despesa";
  description: string;
  amount: string;
  signedAmount: string;
};

export type LedgerSummary = {
  received: string;
  expenses: string;
  net: string;
  receivable: string;
};

export function buildLedger(input: {
  payments: {
    paidAt: string | null;
    createdAt: string;
    amount: string;
    status: string;
    clientName: string;
  }[];
  expenses: { date: string; category: string | null; type: string; amount: string }[];
  openReceivable: string;
}): { entries: LedgerEntry[]; summary: LedgerSummary } {
  const receipts: LedgerEntry[] = input.payments
    .filter((p) => p.status === "confirmado")
    .map((p, i) => ({
      id: `receipt-${i}`,
      date: (p.paidAt ?? p.createdAt).slice(0, 10),
      kind: "recebimento" as const,
      description: `Recebimento — ${p.clientName}`,
      amount: p.amount,
      signedAmount: p.amount,
    }));

  const outflows: LedgerEntry[] = input.expenses.map((e, i) => ({
    id: `expense-${i}`,
    date: e.date.slice(0, 10),
    kind: "despesa" as const,
    description: `${e.category ?? "Despesa"} (${e.type})`,
    amount: e.amount,
    signedAmount: fromCents(-toCents(e.amount)),
  }));

  const entries = [...receipts, ...outflows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const receivedCents = receipts.reduce((s, e) => s + toCents(e.amount), 0);
  const expensesCents = outflows.reduce((s, e) => s + toCents(e.amount), 0);

  return {
    entries,
    summary: {
      received: fromCents(receivedCents),
      expenses: fromCents(expensesCents),
      net: fromCents(receivedCents - expensesCents),
      receivable: input.openReceivable,
    },
  };
}
