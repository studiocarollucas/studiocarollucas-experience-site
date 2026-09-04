import { pgTable, uuid, text, date, time, integer, numeric, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const shootStatusEnum = pgEnum("shoot_status", [
  "reserva",
  "preparacao",
  "realizado",
  "edicao",
  "finalizado",
  "reveal",
  "entregue",
  "cancelado",
  "reagendado",
]);

// Cached/denormalized, NOT a second source of truth: this column exists so admin
// list views don't have to re-sum Payment rows on every render. It must only ever
// be written by the payment-registration domain function (Epic 2's SCL-220, which
// calls domain/payments' deriveShootPaymentStatus() from Task 5 of this plan) — it
// is never user-editable directly. The real source of truth is always the sum of
// confirmed Payment rows for this shoot; see PRD §7.5 and the Payment task's
// derivation function for the actual calculation.
export const shootPaymentStatusEnum = pgEnum("shoot_payment_status", [
  "nao_iniciado",
  "parcial",
  "pago",
  "reembolsado",
  "cancelado",
]);

export const shoots = pgTable("shoots", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull(),
  experiencePackageId: uuid("experience_package_id").notNull(),
  shootDate: date("shoot_date").notNull(),
  startTime: time("start_time"),
  status: shootStatusEnum("status").notNull().default("reserva"),
  agreedPrice: numeric("agreed_price", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: shootPaymentStatusEnum("payment_status").notNull().default("nao_iniciado"),
  participantCount: integer("participant_count"),
  occasion: text("occasion"),
  referral: text("referral"),
  notes: text("notes"),
  portalEnabled: boolean("portal_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Shoot = typeof shoots.$inferSelect;
export type NewShoot = typeof shoots.$inferInsert;
