import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { leads } from "./leads";

export const leadConversions = pgTable("lead_conversions", {
  leadId: uuid("lead_id")
    .primaryKey()
    .references(() => leads.id, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  convertedByUserId: uuid("converted_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LeadConversion = typeof leadConversions.$inferSelect;
