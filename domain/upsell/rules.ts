import type { UpsellOrderStatus, UpsellProductKind } from "@/db/schema/upsell";
import { calculateBalance, deriveShootPaymentStatus } from "@/domain/payments/balance";
import { fromCents, toCents } from "@/lib/money";
import { UpsellError } from "./errors";

// Pure rules for SCL-506/507. No database access here, so the portal, the Admin
// and the tests share exactly the same pricing and lifecycle decisions.

export type OfferedUpsellProduct = {
  productId: string;
  kind: UpsellProductKind;
  name: string;
  description: string | null;
  price: string;
};

export type RequestedUpsellItem = { productId: string; quantity: number };

export type QuotedUpsellItem = {
  productId: string;
  kind: UpsellProductKind;
  name: string;
  description: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
};

export const MAX_UPSELL_ITEM_QUANTITY = 99;
export const MAX_UPSELL_ORDER_ITEMS = 20;

/**
 * Prices a client's request against the offers read on the server. The browser
 * only ever sends product ids and quantities: name, kind, description and price
 * come from `offers` and become the order's snapshot.
 */
export function quoteUpsellOrder(
  offers: OfferedUpsellProduct[],
  items: RequestedUpsellItem[],
): { items: QuotedUpsellItem[]; total: string } {
  if (items.length === 0) throw new UpsellError("Escolha ao menos um produto.");
  if (items.length > MAX_UPSELL_ORDER_ITEMS) throw new UpsellError("Pedido com itens demais.");

  const offersById = new Map(offers.map((offer) => [offer.productId, offer]));
  const seen = new Set<string>();
  let totalCents = 0;

  const quoted = items.map((item): QuotedUpsellItem => {
    if (seen.has(item.productId)) throw new UpsellError("Cada produto só pode aparecer uma vez no pedido.");
    seen.add(item.productId);

    const offer = offersById.get(item.productId);
    if (!offer) throw new UpsellError("Este produto não está disponível na sua galeria.");

    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_UPSELL_ITEM_QUANTITY) {
      throw new UpsellError("Quantidade inválida.");
    }
    if (offer.kind === "colecao_completa" && item.quantity !== 1) {
      throw new UpsellError("A coleção completa é pedida uma única vez.");
    }

    const lineCents = toCents(offer.price) * item.quantity;
    totalCents += lineCents;
    return {
      productId: offer.productId,
      kind: offer.kind,
      name: offer.name,
      description: offer.description,
      unitPrice: fromCents(toCents(offer.price)),
      quantity: item.quantity,
      lineTotal: fromCents(lineCents),
    };
  });

  return { items: quoted, total: fromCents(totalCents) };
}

const TRANSITIONS: Record<UpsellOrderStatus, readonly UpsellOrderStatus[]> = {
  solicitado: ["confirmado", "cancelado"],
  confirmado: ["em_producao", "entregue", "cancelado"],
  em_producao: ["entregue", "cancelado"],
  entregue: [],
  cancelado: [],
};

export function upsellOrderNextStatuses(from: UpsellOrderStatus): readonly UpsellOrderStatus[] {
  return TRANSITIONS[from];
}

export function canTransitionUpsellOrder(from: UpsellOrderStatus, to: UpsellOrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

const CHARGEABLE: ReadonlySet<UpsellOrderStatus> = new Set(["confirmado", "em_producao", "entregue"]);

/** The studio charges only orders it confirmed; a request or a cancelled order owes nothing. */
export function upsellOrderAcceptsPayments(status: UpsellOrderStatus): boolean {
  return CHARGEABLE.has(status);
}

/** Same set: an open balance on these orders is money the studio still expects. */
export function upsellOrderIsReceivable(status: UpsellOrderStatus): boolean {
  return CHARGEABLE.has(status);
}

type PaymentForBalance = { amount: string; status: "pendente" | "confirmado" | "estornado" };

/**
 * The order's money, derived from the Payment rows linked to it with the same
 * functions that derive a Shoot balance (PRD §7.5) — nothing is stored.
 */
export function summarizeUpsellOrderMoney(
  total: string,
  payments: PaymentForBalance[],
): { paid: string; balance: string; paymentStatus: "nao_iniciado" | "parcial" | "pago" } {
  const paidCents = payments
    .filter((payment) => payment.status === "confirmado")
    .reduce((sum, payment) => sum + toCents(payment.amount), 0);
  return {
    paid: fromCents(paidCents),
    balance: calculateBalance(total, payments),
    paymentStatus: deriveShootPaymentStatus(total, payments),
  };
}

export type UpsellOrderMoney = ReturnType<typeof summarizeUpsellOrderMoney>;

/** Favorites beyond the photos included in the package (SCL-504 count → SCL-506 offer). */
export function suggestExtraPhotos(favorites: number, includedPhotos: number | null): number {
  if (includedPhotos === null) return 0;
  return Math.max(0, favorites - includedPhotos);
}
