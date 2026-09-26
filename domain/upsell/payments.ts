import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { payments, upsellOrders, type Payment } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { UpsellError, upsellErrorFromDatabase } from "./errors";
import { summarizeUpsellOrderMoney, upsellOrderAcceptsPayments, type UpsellOrderMoney } from "./rules";
import { upsellPaymentSchema, type UpsellPaymentInput } from "./schema";

/**
 * Charges an upsell order through the existing Payment model (SCL-507,
 * docs/DECISIONS.md 2026-09-26): the receipt is an ordinary Payment of the
 * order's Shoot, tagged with `upsell_order_id`, so it shows up in the ledger
 * like any other. It is excluded from the Shoot balance and never touches
 * `shoots.payment_status`; the order balance is derived from these rows.
 */
export async function registerUpsellPayment(
  input: UpsellPaymentInput,
  actorUserId: string | null,
): Promise<{ payment: Payment; orderId: string; shootId: string; money: UpsellOrderMoney }> {
  const { orderId, ...fields } = upsellPaymentSchema.parse(input);

  try {
    return await db.transaction(async (tx) => {
      // Locks the order so concurrent registrations and status changes serialize.
      const [order] = await tx
        .select({
          id: upsellOrders.id,
          shootId: upsellOrders.shootId,
          status: upsellOrders.status,
          total: upsellOrders.total,
        })
        .from(upsellOrders)
        .where(eq(upsellOrders.id, orderId))
        .limit(1)
        .for("update");
      if (!order) throw new UpsellError("Pedido inexistente.");
      if (!upsellOrderAcceptsPayments(order.status)) {
        throw new UpsellError(
          order.status === "cancelado"
            ? "Pedido cancelado não recebe pagamentos."
            : "Confirme o pedido antes de registrar pagamentos.",
        );
      }

      const existing = await tx
        .select({ amount: payments.amount, status: payments.status })
        .from(payments)
        .where(eq(payments.upsellOrderId, order.id));

      const [payment] = await tx
        .insert(payments)
        .values({ ...fields, shootId: order.shootId, upsellOrderId: order.id })
        .returning();

      const money = summarizeUpsellOrderMoney(order.total, [
        ...existing,
        { amount: payment.amount, status: payment.status },
      ]);

      await recordAuditEvent(
        {
          actorUserId,
          action: "payment.registered",
          entityType: "payment",
          entityId: payment.id,
          before: null,
          after: { payment, upsellOrderId: order.id, orderBalance: money.balance, orderPaymentStatus: money.paymentStatus },
        },
        tx,
      );
      return { payment, orderId: order.id, shootId: order.shootId, money };
    });
  } catch (error) {
    throw upsellErrorFromDatabase(error) ?? error;
  }
}
