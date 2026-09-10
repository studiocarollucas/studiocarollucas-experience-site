"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { updatePaixaoClutch, reorderPaixaoClutch } from "@/domain/inventory/clutch";
import { updatePaixaoClutchSchema, reorderPaixaoClutchSchema } from "@/domain/inventory/clutch-schema";

export const updatePaixaoClutchAction = defineAdminAction(
  { role: "staff", input: updatePaixaoClutchSchema },
  async (input, ctx) => {
    const item = await updatePaixaoClutch(input, ctx.user.id);
    revalidatePath("/admin/paixao-clutch");
    return { id: item.id };
  }
);

export const reorderPaixaoClutchAction = defineAdminAction(
  { role: "staff", input: reorderPaixaoClutchSchema },
  async (input, ctx) => {
    await reorderPaixaoClutch(input, ctx.user.id);
    revalidatePath("/admin/paixao-clutch");
    return { reordered: true };
  }
);
