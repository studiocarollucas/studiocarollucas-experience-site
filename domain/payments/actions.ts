"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { registerPayment } from "./register-payment";
import { createPaymentSchema } from "./schema";
import { recordAuditEvent } from "@/domain/audit/service";

export const registerPaymentAction = defineAdminAction(
  { role: "staff", input: createPaymentSchema },
  async (input, ctx) => {
    const { payment, shootPaymentStatus, balance } = await registerPayment(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "payment.registered",
      entityType: "payment",
      entityId: payment.id,
      before: null,
      after: { payment, shootPaymentStatus, balance },
    });
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath("/admin/financeiro");
    revalidatePath("/admin");
    return { shootId: input.shootId };
  },
);
