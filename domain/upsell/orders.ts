import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  clients,
  payments,
  shoots,
  upsellOrderItems,
  upsellOrders,
  upsellOrderStatusValues,
  type Payment,
  type UpsellOrder,
  type UpsellOrderItem,
  type UpsellOrderStatus,
} from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { UpsellError } from "./errors";
import { upsellOrderStatusLabels } from "./labels";
import {
  canTransitionUpsellOrder,
  summarizeUpsellOrderMoney,
  upsellOrderNextStatuses,
  type UpsellOrderMoney,
} from "./rules";
import { upsellOrderStatusChangeSchema, type UpsellOrderStatusChangeInput } from "./schema";

// SCL-507, Admin side: follow orders, move them through their lifecycle and
// read their money from the Payment rows linked to them.

export type UpsellOrderListRow = {
  id: string;
  status: UpsellOrderStatus;
  total: string;
  createdAt: Date;
  clientId: string;
  clientName: string;
  shootId: string;
  shootDate: string;
  money: UpsellOrderMoney;
};

export function normalizeUpsellOrderStatusFilter(raw: unknown): UpsellOrderStatus | undefined {
  return typeof raw === "string" && (upsellOrderStatusValues as readonly string[]).includes(raw)
    ? (raw as UpsellOrderStatus)
    : undefined;
}

async function readOrderPayments(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, { amount: string; status: Payment["status"] }[]>();
  const rows = await db
    .select({ upsellOrderId: payments.upsellOrderId, amount: payments.amount, status: payments.status })
    .from(payments)
    .where(inArray(payments.upsellOrderId, orderIds));
  const byOrder = new Map<string, { amount: string; status: Payment["status"] }[]>();
  for (const row of rows) {
    if (!row.upsellOrderId) continue;
    const list = byOrder.get(row.upsellOrderId) ?? [];
    list.push({ amount: row.amount, status: row.status });
    byOrder.set(row.upsellOrderId, list);
  }
  return byOrder;
}

export async function listUpsellOrders(filter: { status?: UpsellOrderStatus } = {}): Promise<UpsellOrderListRow[]> {
  const rows = await db
    .select({
      id: upsellOrders.id,
      status: upsellOrders.status,
      total: upsellOrders.total,
      createdAt: upsellOrders.createdAt,
      clientId: upsellOrders.clientId,
      clientName: clients.name,
      shootId: upsellOrders.shootId,
      shootDate: shoots.shootDate,
    })
    .from(upsellOrders)
    .innerJoin(clients, eq(upsellOrders.clientId, clients.id))
    .innerJoin(shoots, eq(upsellOrders.shootId, shoots.id))
    .where(filter.status ? eq(upsellOrders.status, filter.status) : undefined)
    .orderBy(desc(upsellOrders.createdAt))
    .limit(200);

  const paymentsByOrder = await readOrderPayments(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    money: summarizeUpsellOrderMoney(row.total, paymentsByOrder.get(row.id) ?? []),
  }));
}

export type UpsellOrderDetail = {
  order: UpsellOrder;
  clientName: string;
  shootDate: string;
  items: UpsellOrderItem[];
  payments: Payment[];
  money: UpsellOrderMoney;
  nextStatuses: readonly UpsellOrderStatus[];
};

export async function getUpsellOrderDetail(id: string): Promise<UpsellOrderDetail | null> {
  const [row] = await db
    .select({ order: upsellOrders, clientName: clients.name, shootDate: shoots.shootDate })
    .from(upsellOrders)
    .innerJoin(clients, eq(upsellOrders.clientId, clients.id))
    .innerJoin(shoots, eq(upsellOrders.shootId, shoots.id))
    .where(eq(upsellOrders.id, id))
    .limit(1);
  if (!row) return null;

  const [items, orderPayments] = await Promise.all([
    db.select().from(upsellOrderItems).where(eq(upsellOrderItems.orderId, id)).orderBy(asc(upsellOrderItems.createdAt)),
    db.select().from(payments).where(eq(payments.upsellOrderId, id)).orderBy(desc(payments.createdAt)),
  ]);

  return {
    order: row.order,
    clientName: row.clientName,
    shootDate: row.shootDate,
    items,
    payments: orderPayments,
    money: summarizeUpsellOrderMoney(
      row.order.total,
      orderPayments.map((payment) => ({ amount: payment.amount, status: payment.status })),
    ),
    nextStatuses: upsellOrderNextStatuses(row.order.status),
  };
}

/**
 * Moves an order through solicitado → confirmado → em_producao → entregue (or
 * cancelado). The row is locked so concurrent changes serialize; repeating the
 * current status is a no-op, and every real change is audited in the same
 * transaction. Payment status is not touched: it is derived from Payments.
 */
export async function changeUpsellOrderStatus(
  input: UpsellOrderStatusChangeInput,
  actorUserId: string | null,
): Promise<{ orderId: string; status: UpsellOrderStatus; changed: boolean }> {
  const { orderId, status } = upsellOrderStatusChangeSchema.parse(input);

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: upsellOrders.id, status: upsellOrders.status })
      .from(upsellOrders)
      .where(eq(upsellOrders.id, orderId))
      .limit(1)
      .for("update");
    if (!current) throw new UpsellError("Pedido inexistente.");
    if (current.status === status) return { orderId, status, changed: false };
    if (!canTransitionUpsellOrder(current.status, status)) {
      throw new UpsellError(
        `Não é possível passar o pedido de "${upsellOrderStatusLabels[current.status]}" para "${upsellOrderStatusLabels[status]}".`,
      );
    }

    await tx.update(upsellOrders).set({ status, updatedAt: new Date() }).where(eq(upsellOrders.id, orderId));
    await recordAuditEvent(
      {
        actorUserId,
        action: "upsell_order.status_changed",
        entityType: "upsell_order",
        entityId: orderId,
        before: { status: current.status },
        after: { status },
      },
      tx,
    );
    return { orderId, status, changed: true };
  });
}
