import "server-only";

import { asc, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { clients, referrals } from "@/db/schema";

export type LeadReferralView = {
  id: string;
  referrerClientId: string;
  referrerName: string;
  referredClientId: string | null;
  convertedAt: Date | null;
  createdAt: Date;
};

export type ReferrerOption = { id: string; name: string };

export type LeadReferralPanel = {
  referral: LeadReferralView | null;
  referrerOptions: ReferrerOption[];
};

/** The Lead's referral (with the referrer's name) and the Clients that can be picked as referrer. */
export async function getLeadReferralPanel(leadId: string): Promise<LeadReferralPanel> {
  const [referral] = await db
    .select({
      id: referrals.id,
      referrerClientId: referrals.referrerClientId,
      referrerName: clients.name,
      referredClientId: referrals.referredClientId,
      convertedAt: referrals.convertedAt,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .innerJoin(clients, eq(referrals.referrerClientId, clients.id))
    .where(eq(referrals.leadId, leadId))
    .limit(1);

  const referrerOptions = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .orderBy(asc(clients.name));

  return { referral: referral ?? null, referrerOptions };
}

export type ClientReferralSummary = {
  referredBy: { id: string; name: string } | null;
  /** Referrals this Client made (informed). */
  made: number;
  /** Of those, how many already point to a Client (converted). */
  converted: number;
};

export async function getClientReferralSummary(clientId: string): Promise<ClientReferralSummary> {
  const [referredBy] = await db
    .select({ id: clients.id, name: clients.name })
    .from(referrals)
    .innerJoin(clients, eq(referrals.referrerClientId, clients.id))
    .where(eq(referrals.referredClientId, clientId))
    .limit(1);

  // count(column) skips nulls: a referral is converted exactly when it has a referred Client.
  const [made] = await db
    .select({ total: count(), converted: count(referrals.referredClientId) })
    .from(referrals)
    .where(eq(referrals.referrerClientId, clientId));

  return {
    referredBy: referredBy ?? null,
    made: Number(made?.total ?? 0),
    converted: Number(made?.converted ?? 0),
  };
}

const metricsRangeSchema = z.object({ from: z.iso.date(), to: z.iso.date() });

export type ReferralMetrics = { informed: number; converted: number };

/**
 * Referrals informed (created) and converted within the period, counted in the
 * database from the normalized rows (PRD §7.1 — no stored aggregates). The
 * period is inclusive calendar dates, evaluated like the rest of the dashboard
 * (docs/DECISIONS.md, 2026-09-06, UTC month range).
 */
export async function getReferralMetrics(range: { from: string; to: string }): Promise<ReferralMetrics> {
  const { from, to } = metricsRangeSchema.parse(range);
  const inPeriod = (column: typeof referrals.createdAt | typeof referrals.convertedAt) =>
    sql`${column} >= ${from}::date and ${column} < ${to}::date + 1`;

  const [row] = await db
    .select({
      informed: sql<number>`count(*) filter (where ${inPeriod(referrals.createdAt)})`.mapWith(Number),
      converted: sql<number>`count(*) filter (where ${inPeriod(referrals.convertedAt)})`.mapWith(Number),
    })
    .from(referrals);

  return { informed: row?.informed ?? 0, converted: row?.converted ?? 0 };
}
