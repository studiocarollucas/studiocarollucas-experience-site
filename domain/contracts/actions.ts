"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { issueContractSchema } from "./schema";
import { issueContractForRevalidation } from "./service";

export const issueContractAction = defineAdminAction(
  { role: "staff", input: issueContractSchema },
  async (input, ctx) => {
    const { result, clientId } = await issueContractForRevalidation({ input, issuedByAuthUserId: ctx.user.id });
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath("/admin/agenda");
    revalidatePath(`/admin/clientes/${clientId}`);
    revalidatePath("/admin/clientes");
    return result;
  },
);
