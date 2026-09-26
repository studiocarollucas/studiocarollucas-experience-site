import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { leads } from "./leads";
import { shoots } from "./shoots";

// SCL-720 (PRD §7.10): Review and Referral. Both tables are staff-only through
// the Data API (migration 0051) and written by the domain services, which audit
// every change in the same transaction.

export const reviewStatusValues = ["solicitado", "concluido", "cancelado"] as const;
export const reviewSourceValues = ["manual", "automacao", "portal"] as const;
export const reviewTargetValues = ["google", "instagram", "interno", "outro"] as const;
export const referralSourceValues = ["lead", "cliente", "legado"] as const;

export type ReviewStatus = (typeof reviewStatusValues)[number];
export type ReviewSource = (typeof reviewSourceValues)[number];
export type ReviewTarget = (typeof reviewTargetValues)[number];
export type ReferralSource = (typeof referralSourceValues)[number];

export const reviewStatusEnum = pgEnum("review_status", reviewStatusValues);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    // Optional: a review can be about the relationship, not one Shoot. When set,
    // the trigger reviews_shoot_matches_client keeps it on the same Client.
    shootId: uuid("shoot_id").references(() => shoots.id, { onDelete: "set null" }),
    status: reviewStatusEnum("status").notNull().default("solicitado"),
    // How the request was registered (Admin by hand, automation, client portal).
    source: text("source", { enum: reviewSourceValues }).notNull(),
    // External destination of the review (e.g. Google Business Profile).
    target: text("target", { enum: reviewTargetValues }).notNull(),
    targetUrl: text("target_url"),
    requestedAt: timestamp("requested_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("reviews_source_valid", sql`${table.source} in ('manual', 'automacao', 'portal')`),
    check("reviews_target_valid", sql`${table.target} in ('google', 'instagram', 'interno', 'outro')`),
    check(
      "reviews_requested_has_requested_at",
      sql`${table.status} <> 'solicitado' or ${table.requestedAt} is not null`,
    ),
    check(
      "reviews_completed_has_completed_at",
      sql`(${table.status} = 'concluido') = (${table.completedAt} is not null)`,
    ),
    check(
      "reviews_completed_after_requested",
      sql`${table.requestedAt} is null or ${table.completedAt} is null or ${table.completedAt} >= ${table.requestedAt}`,
    ),
    index("reviews_client_idx").on(table.clientId),
    // One active (requested or completed) review per Shoot and destination, so a
    // repeated post-delivery request (SCL-704) never asks twice.
    uniqueIndex("reviews_one_active_per_shoot_target_idx")
      .on(table.shootId, table.target)
      .where(sql`${table.shootId} is not null and ${table.status} <> 'cancelado'`),
  ],
);

// Single source of truth for "who referred whom" (replaces the legacy
// clients.referrer_client_id, frozen by migration 0051 — docs/DECISIONS.md).
// A referral is "converted" exactly when it points to a Client
// (referrals_converted_consistent); the trigger referrals_guard_graph rejects
// cycles between clients.
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerClientId: uuid("referrer_client_id")
      .notNull()
      .references(() => clients.id),
    referredClientId: uuid("referred_client_id").references(() => clients.id),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    source: text("source", { enum: referralSourceValues }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
  },
  (table) => [
    unique("referrals_referred_client_id_unique").on(table.referredClientId),
    unique("referrals_lead_id_unique").on(table.leadId),
    check("referrals_source_valid", sql`${table.source} in ('lead', 'cliente', 'legado')`),
    check("referrals_has_referred", sql`${table.referredClientId} is not null or ${table.leadId} is not null`),
    check("referrals_lead_source_has_lead", sql`${table.source} <> 'lead' or ${table.leadId} is not null`),
    check("referrals_not_self", sql`${table.referrerClientId} <> ${table.referredClientId}`),
    check(
      "referrals_converted_consistent",
      sql`(${table.referredClientId} is null) = (${table.convertedAt} is null)`,
    ),
    index("referrals_referrer_client_idx").on(table.referrerClientId),
  ],
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;
