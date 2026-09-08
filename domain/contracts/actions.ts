"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { issueContractSchema } from "./schema";
import { issueContract } from "./service";

export const issueContractAction = defineAdminAction(
  { role: "staff", input: issueContractSchema },
  async (input, ctx) => {
    const issued = await issueContract({ input, issuedByAuthUserId: ctx.user.id });
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath("/admin/agenda");
    revalidatePath(`/admin/clientes/${issued.clientId}`);
    revalidatePath("/admin/clientes");
    return issued;
  },
);
