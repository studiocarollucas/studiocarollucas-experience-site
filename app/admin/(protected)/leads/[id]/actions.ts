"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { convertWonLead } from "@/domain/leads/conversion";
import { createConfirmedShootFromLead } from "@/domain/leads/converted-shoot";
import { transitionLeadStatus } from "@/domain/leads/detail";
import { transitionLeadStatusSchema } from "@/domain/leads/schema";
import { newShootFormSchema } from "@/domain/shoots/form-schema";

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

const conversionInputSchema = z.discriminatedUnion("mode", [
  z.object({ leadId: z.string().uuid(), mode: z.literal("existing"), clientId: z.string().uuid() }),
  z.object({ leadId: z.string().uuid(), mode: z.literal("new") }),
]);

export const convertLeadAction = defineAdminAction(
  { role: "staff", input: conversionInputSchema },
  async (input, ctx) => {
    const client = input.mode === "existing"
      ? { mode: "existing" as const, clientId: input.clientId }
      : { mode: "new" as const };
    const result = await convertWonLead({ leadId: input.leadId, actorUserId: ctx.user.id, client });
    revalidatePath(`/admin/leads/${input.leadId}`);
    return { clientId: result.client.id };
  },
);

const leadShootInputSchema = newShootFormSchema
  .omit({ clientId: true })
  .extend({ leadId: z.string().uuid() });

export const createLeadShootAction = defineAdminAction(
  { role: "staff", input: leadShootInputSchema },
  async (input, ctx) => {
    const { leadId, ...shoot } = input;
    const result = await createConfirmedShootFromLead({
      leadId,
      actorUserId: ctx.user.id,
      shoot,
    });
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/producao");
    return { id: result.shoot.id };
  },
);
