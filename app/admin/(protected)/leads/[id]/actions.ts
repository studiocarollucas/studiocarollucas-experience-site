"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { transitionLeadStatus } from "@/domain/leads/detail";
import { transitionLeadStatusSchema } from "@/domain/leads/schema";

const transitionLeadStatusFormSchema = z.preprocess(
  (raw) => (raw instanceof FormData ? Object.fromEntries(raw.entries()) : raw),
  transitionLeadStatusSchema.omit({ actorUserId: true }),
);

export const transitionLeadStatusAction = defineAdminAction(
  { role: "staff", input: transitionLeadStatusFormSchema },
  async (input, ctx) => {
    await transitionLeadStatus({ ...input, actorUserId: ctx.user.id });
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${input.leadId}`);
    return { id: input.leadId };
  },
);
