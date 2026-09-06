import { toCents, fromCents } from "@/lib/money";

type PaymentForBalance = { amount: string; status: "pendente" | "confirmado" | "estornado" };

function sumConfirmed(payments: PaymentForBalance[]): number {
  return payments
    .filter((p) => p.status === "confirmado")
    .reduce((sum, p) => sum + toCents(p.amount), 0);
}

/**
 * saldo = valor_acordado - soma(pagamentos confirmados) — PRD §7.5.
 * Deliberately not clamped at zero: a negative result signals overpayment,
 * which is a real state the UI (Epic 2) should surface, not silently hide.
 */
export function calculateBalance(agreedPrice: string, payments: PaymentForBalance[]): string {
  const balanceCents = toCents(agreedPrice) - sumConfirmed(payments);
  return fromCents(balanceCents);
}

/**
 * Derives only the three states this function can determine from confirmed
 * payments vs. agreed price. "reembolsado" and "cancelado" are not derivable this
 * way — they represent an explicit event (a refund was issued; the shoot was
 * cancelled), not a payment-sum threshold, and must be set directly by the
 * domain action that handles that event (Epic 2), not by this function.
 */
export function deriveShootPaymentStatus(
  agreedPrice: string,
  payments: PaymentForBalance[]
): "nao_iniciado" | "parcial" | "pago" {
  const confirmedCents = sumConfirmed(payments);
  if (confirmedCents <= 0) return "nao_iniciado";
  if (confirmedCents >= toCents(agreedPrice)) return "pago";
  return "parcial";
}
