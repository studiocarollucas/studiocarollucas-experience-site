"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { createExpense } from "@/domain/payments/service";
import { recordAuditEvent } from "@/domain/audit/service";
import { expenseFormSchema } from "./expense-form-schema";

export const createExpenseAction = defineAdminAction(
  { role: "staff", input: expenseFormSchema },
  async (input, ctx) => {
    const created = await createExpense(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "expense.created",
      entityType: "expense",
      entityId: created.id,
      before: null,
      after: created,
    });
    revalidatePath("/admin/financeiro/despesas");
    revalidatePath("/admin/financeiro");
    revalidatePath("/admin");
    return { id: created.id };
  },
);
