import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import type { db } from "@/db/client";
import { referrals, type Referral } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { REFERRAL_MESSAGES, ReferralError, referralErrorFromDatabase } from "./errors";

export type ReferralWriter = Pick<typeof db, "select" | "update" | "insert">;

type LinkLeadReferralInput = {
  leadId: string;
  clientId: string;
  /** The conversion timestamp (lead_conversions.created_at). */
  convertedAt: Date;
  actorUserId: string;
};

/**
 * Called by convertWonLead inside its transaction (SCL-722), after the
 * conversion row exists: the Lead's referral, if any, now points to the
 * converted Client and becomes "converted". Any inconsistency throws, which
 * rolls back the whole conversion — the Admin gets an actionable message
 * instead of a Client whose referral contradicts the graph.
 */
export async function linkLeadReferralOnConversion(
  tx: ReferralWriter,
  input: LinkLeadReferralInput,
): Promise<Referral | null> {
  const [referral] = await tx
    .select()
    .from(referrals)
    .where(eq(referrals.leadId, input.leadId))
    .limit(1)
    .for("update");
  if (!referral) return null;

  if (referral.referredClientId) {
    if (referral.referredClientId === input.clientId) return referral;
    throw new ReferralError(REFERRAL_MESSAGES.conversionMismatch);
  }
  if (referral.referrerClientId === input.clientId) {
    throw new ReferralError(REFERRAL_MESSAGES.conversionSelf);
  }

  const [alreadyReferred] = await tx
    .select({ id: referrals.id })
    .from(referrals)
    .where(eq(referrals.referredClientId, input.clientId))
    .limit(1);
  if (alreadyReferred) throw new ReferralError(REFERRAL_MESSAGES.conversionAlreadyReferred);

  let converted: Referral | undefined;
  try {
    [converted] = await tx
      .update(referrals)
      .set({ referredClientId: input.clientId, convertedAt: input.convertedAt })
      .where(and(eq(referrals.id, referral.id), isNull(referrals.referredClientId)))
      .returning();
  } catch (error) {
    // e.g. the cycle trigger (referrals_no_cycle); rethrowing aborts the transaction.
    throw referralErrorFromDatabase(error) ?? error;
  }
  if (!converted) throw new Error("Indicação alterada durante a conversão.");

  await recordAuditEvent(
    {
      actorUserId: input.actorUserId,
      action: "lead.referral_converted",
      entityType: "lead",
      entityId: input.leadId,
      before: { referralId: referral.id, referredClientId: null, convertedAt: null },
      after: { referralId: converted.id, referredClientId: converted.referredClientId, convertedAt: converted.convertedAt },
    },
    tx,
  );
  return converted;
}
