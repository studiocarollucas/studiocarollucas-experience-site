"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionableAdminActionError, defineAdminAction } from "@/lib/auth/admin-action";
import { convertWonLead } from "@/domain/leads/conversion";
import { createConfirmedShootFromLead } from "@/domain/leads/converted-shoot";
import { transitionLeadStatus } from "@/domain/leads/detail";
import { transitionLeadStatusSchema } from "@/domain/leads/schema";
import { newShootFormSchema } from "@/domain/shoots/form-schema";
import { ReferralError } from "@/domain/referrals/errors";
import { removeLeadReferral, setLeadReferral } from "@/domain/referrals/service";

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
    let result;
    try {
      result = await convertWonLead({ leadId: input.leadId, actorUserId: ctx.user.id, client });
    } catch (err) {
      if (err instanceof ReferralError) throw new ActionableAdminActionError(err.message);
      throw err;
    }
    revalidatePath(`/admin/leads/${input.leadId}`);
    revalidatePath("/admin");
    return { clientId: result.client.id };
  },
);

const leadReferralInputSchema = z.object({
  leadId: z.string().uuid(),
  referrerClientId: z
    .string({ error: "Selecione a cliente que indicou." })
    .uuid("Selecione a cliente que indicou."),
});

export const setLeadReferralAction = defineAdminAction(
  { role: "staff", input: leadReferralInputSchema },
  async (input, ctx) => {
    try {
      await setLeadReferral({ ...input, actorUserId: ctx.user.id });
    } catch (err) {
      if (err instanceof ReferralError) {
        throw new ActionableAdminActionError(err.message, { referrerClientId: [err.message] });
      }
      throw err;
    }
    revalidatePath(`/admin/leads/${input.leadId}`);
    revalidatePath("/admin");
    return { leadId: input.leadId };
  },
);

export const removeLeadReferralAction = defineAdminAction(
  { role: "staff", input: z.object({ leadId: z.string().uuid() }) },
  async (input, ctx) => {
    try {
      await removeLeadReferral({ leadId: input.leadId, actorUserId: ctx.user.id });
    } catch (err) {
      if (err instanceof ReferralError) throw new ActionableAdminActionError(err.message);
      throw err;
    }
    revalidatePath(`/admin/leads/${input.leadId}`);
    revalidatePath("/admin");
    return { leadId: input.leadId };
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
