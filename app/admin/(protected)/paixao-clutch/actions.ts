"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { updatePaixaoClutch } from "@/domain/inventory/clutch";
import { updatePaixaoClutchSchema } from "@/domain/inventory/clutch-schema";

export const updatePaixaoClutchAction = defineAdminAction(
  { role: "staff", input: updatePaixaoClutchSchema },
  async (input, ctx) => {
    const item = await updatePaixaoClutch(input, ctx.user.id);
    revalidatePath("/admin/paixao-clutch");
    return { id: item.id };
  }
);
