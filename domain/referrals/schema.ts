import { z } from "zod";
import { REFERRAL_MESSAGES } from "./errors";

export const setLeadReferralSchema = z.object({
  leadId: z.string().uuid(),
  referrerClientId: z.string().uuid(),
  actorUserId: z.string().uuid(),
});

export const removeLeadReferralSchema = z.object({
  leadId: z.string().uuid(),
  actorUserId: z.string().uuid(),
});

export const recordClientReferralSchema = z
  .object({
    referrerClientId: z.string().uuid(),
    referredClientId: z.string().uuid(),
    actorUserId: z.string().uuid(),
  })
  .refine((value) => value.referrerClientId !== value.referredClientId, {
    path: ["referredClientId"],
    message: REFERRAL_MESSAGES.self,
  });

export type SetLeadReferralInput = z.input<typeof setLeadReferralSchema>;
export type RemoveLeadReferralInput = z.input<typeof removeLeadReferralSchema>;
export type RecordClientReferralInput = z.input<typeof recordClientReferralSchema>;
