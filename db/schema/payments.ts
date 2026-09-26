import { pgTable, uuid, numeric, timestamp, text, pgEnum, foreignKey, index } from "drizzle-orm/pg-core";
import { upsellOrders } from "./upsell";

export const paymentEntryStatusEnum = pgEnum("payment_entry_status", [
  "pendente",
  "confirmado",
  "estornado",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shootId: uuid("shoot_id").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
    method: text("method"),
    status: paymentEntryStatusEnum("status").notNull().default("pendente"),
    proofUrl: text("proof_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // SCL-507: set when this receipt pays an upsell order instead of the Shoot's
    // agreed price. Such rows still belong to the Shoot (and to the ledger), but
    // are excluded from the Shoot balance and count toward the order balance —
    // see docs/DECISIONS.md (2026-09-26, upsell) and domain/upsell/payments.ts.
    upsellOrderId: uuid("upsell_order_id"),
  },
  (table) => [
    // Composite FK: the order must be on the same Shoot as the payment.
    foreignKey({
      name: "payments_upsell_order_fk",
      columns: [table.upsellOrderId, table.shootId],
      foreignColumns: [upsellOrders.id, upsellOrders.shootId],
    }),
    index("payments_upsell_order_idx").on(table.upsellOrderId),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
