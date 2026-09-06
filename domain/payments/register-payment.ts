import { db } from "@/db/client";
import { payments, shoots, type Payment } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateBalance, deriveShootPaymentStatus } from "./balance";
import { createPaymentSchema, type CreatePaymentInput } from "./schema";

type PaymentForBalance = { amount: string; status: "pendente" | "confirmado" | "estornado" };

/**
 * Pure planner: given the agreed price, the payments already on the shoot, and the
 * one about to be added, what does the derived cache become? Delegates entirely to
 * the Epic 1 functions — no arithmetic of its own — so PRD §7.5's single source of
 * truth stays single.
 */
export function planPaymentStatusUpdate(
  agreedPrice: string,
  existingPayments: PaymentForBalance[],
  newPayment: PaymentForBalance,
): { nextStatus: "nao_iniciado" | "parcial" | "pago"; nextBalance: string } {
  const all = [...existingPayments, newPayment];
  return {
    nextStatus: deriveShootPaymentStatus(agreedPrice, all),
    nextBalance: calculateBalance(agreedPrice, all),
  };
}

export async function registerPayment(
  input: CreatePaymentInput,
): Promise<{ payment: Payment; shootPaymentStatus: string; balance: string }> {
  const parsed = createPaymentSchema.parse(input);

  return db.transaction(async (tx) => {
    const [shoot] = await tx
      .select({ id: shoots.id, agreedPrice: shoots.agreedPrice })
      .from(shoots)
      .where(eq(shoots.id, parsed.shootId))
      .limit(1);
    if (!shoot) throw new Error("ensaio inexistente");

    const [payment] = await tx.insert(payments).values(parsed).returning();

    const rows = await tx
      .select({ amount: payments.amount, status: payments.status })
      .from(payments)
      .where(eq(payments.shootId, parsed.shootId));

    const nextStatus = deriveShootPaymentStatus(shoot.agreedPrice, rows);
    const balance = calculateBalance(shoot.agreedPrice, rows);

    await tx.update(shoots).set({ paymentStatus: nextStatus }).where(eq(shoots.id, parsed.shootId));

    return { payment, shootPaymentStatus: nextStatus, balance };
  });
}
