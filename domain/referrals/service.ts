import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, leadConversions, leads, referrals, type Referral } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import { REFERRAL_MESSAGES, ReferralError, referralErrorFromDatabase } from "./errors";
import {
  recordClientReferralSchema,
  removeLeadReferralSchema,
  setLeadReferralSchema,
  type RecordClientReferralInput,
  type RemoveLeadReferralInput,
  type SetLeadReferralInput,
} from "./schema";

function auditView(referral: Referral) {
  return {
    referralId: referral.id,
    referrerClientId: referral.referrerClientId,
    referredClientId: referral.referredClientId,
    convertedAt: referral.convertedAt,
  };
}

async function withReferralErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw referralErrorFromDatabase(error) ?? error;
  }
}

/**
 * Records (or changes) who referred a Lead (SCL-722). The Lead row is locked
 * first — the same lock convertWonLead takes — so a referral write and a
 * conversion of the same Lead never interleave. A Lead that was already
 * converted gets a referral that is converted from the start, pointing to the
 * converted Client, so "converted" always means "points to a Client".
 */
export async function setLeadReferral(input: SetLeadReferralInput): Promise<{ referral: Referral; changed: boolean }> {
  const parsed = setLeadReferralSchema.parse(input);

  return withReferralErrors(() =>
    db.transaction(async (tx) => {
      const [lead] = await tx
        .select({ id: leads.id, clientId: leads.clientId })
        .from(leads)
        .where(eq(leads.id, parsed.leadId))
        .limit(1)
        .for("update");
      if (!lead) throw new ReferralError(REFERRAL_MESSAGES.leadMissing);

      const [referrer] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, parsed.referrerClientId))
        .limit(1);
      if (!referrer) throw new ReferralError(REFERRAL_MESSAGES.referrerMissing);

      const [conversion] = await tx
        .select({ clientId: leadConversions.clientId, createdAt: leadConversions.createdAt })
        .from(leadConversions)
        .where(eq(leadConversions.leadId, lead.id))
        .limit(1);
      const referredClientId = conversion?.clientId ?? null;

      if (parsed.referrerClientId === lead.clientId || parsed.referrerClientId === referredClientId) {
        throw new ReferralError(REFERRAL_MESSAGES.self);
      }

      const [existing] = await tx
        .select()
        .from(referrals)
        .where(eq(referrals.leadId, lead.id))
        .limit(1)
        .for("update");

      if (existing) {
        if (existing.referrerClientId === parsed.referrerClientId) return { referral: existing, changed: false };
        if (existing.referredClientId) throw new ReferralError(REFERRAL_MESSAGES.convertedLocked);

        const [updated] = await tx
          .update(referrals)
          .set({ referrerClientId: parsed.referrerClientId })
          .where(and(eq(referrals.id, existing.id), isNull(referrals.referredClientId)))
          .returning();
        if (!updated) throw new ReferralError(REFERRAL_MESSAGES.convertedLocked);

        await recordAuditEvent(
          {
            actorUserId: parsed.actorUserId,
            action: "lead.referral_updated",
            entityType: "lead",
            entityId: lead.id,
            before: auditView(existing),
            after: auditView(updated),
          },
          tx,
        );
        return { referral: updated, changed: true };
      }

      if (referredClientId) {
        const [alreadyReferred] = await tx
          .select({ id: referrals.id })
          .from(referrals)
          .where(eq(referrals.referredClientId, referredClientId))
          .limit(1);
        if (alreadyReferred) throw new ReferralError(REFERRAL_MESSAGES.alreadyReferred);
      }

      const [created] = await tx
        .insert(referrals)
        .values({
          referrerClientId: parsed.referrerClientId,
          referredClientId,
          leadId: lead.id,
          source: "lead",
          convertedAt: conversion?.createdAt ?? null,
        })
        .returning();

      await recordAuditEvent(
        {
          actorUserId: parsed.actorUserId,
          action: "lead.referral_recorded",
          entityType: "lead",
          entityId: lead.id,
          before: null,
          after: auditView(created),
        },
        tx,
      );
      return { referral: created, changed: true };
    }),
  );
}

/** Removes a Lead's referral while it is still only informed (not converted). */
export async function removeLeadReferral(input: RemoveLeadReferralInput): Promise<{ removed: boolean }> {
  const parsed = removeLeadReferralSchema.parse(input);

  return db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(referrals)
      .where(and(eq(referrals.leadId, parsed.leadId), isNull(referrals.referredClientId)))
      .returning();

    if (!removed) {
      const [existing] = await tx
        .select({ id: referrals.id })
        .from(referrals)
        .where(eq(referrals.leadId, parsed.leadId))
        .limit(1);
      if (existing) throw new ReferralError(REFERRAL_MESSAGES.convertedLocked);
      return { removed: false };
    }

    await recordAuditEvent(
      {
        actorUserId: parsed.actorUserId,
        action: "lead.referral_removed",
        entityType: "lead",
        entityId: parsed.leadId,
        before: auditView(removed),
        after: null,
      },
      tx,
    );
    return { removed: true };
  });
}

/**
 * Records that one existing Client referred another existing Client (no Lead
 * involved). The referred person is already a Client, so the referral is
 * converted on creation.
 */
export async function recordClientReferral(input: RecordClientReferralInput): Promise<Referral> {
  const parsed = recordClientReferralSchema.parse(input);

  return withReferralErrors(() =>
    db.transaction(async (tx) => {
      const [referrer] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, parsed.referrerClientId))
        .limit(1);
      if (!referrer) throw new ReferralError(REFERRAL_MESSAGES.referrerMissing);

      const [referred] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, parsed.referredClientId))
        .limit(1);
      if (!referred) throw new ReferralError(REFERRAL_MESSAGES.referredMissing);

      const [alreadyReferred] = await tx
        .select({ id: referrals.id })
        .from(referrals)
        .where(eq(referrals.referredClientId, parsed.referredClientId))
        .limit(1);
      if (alreadyReferred) throw new ReferralError(REFERRAL_MESSAGES.alreadyReferred);

      const [created] = await tx
        .insert(referrals)
        .values({
          referrerClientId: parsed.referrerClientId,
          referredClientId: parsed.referredClientId,
          source: "cliente",
          convertedAt: new Date(),
        })
        .returning();

      await recordAuditEvent(
        {
          actorUserId: parsed.actorUserId,
          action: "client.referral_recorded",
          entityType: "client",
          entityId: parsed.referredClientId,
          before: null,
          after: auditView(created),
        },
        tx,
      );
      return created;
    }),
  );
}
