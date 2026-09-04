import { pgTable, uuid, text, boolean, date, timestamp } from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Nullable + unique: a Client business record can exist before the person ever
  // logs in (e.g. Admin adds them from a phone call). This gets populated once
  // they have portal access, linking the CRM record to their Supabase Auth session.
  // References auth.users directly (not `profiles.id`) because that's the stable
  // Supabase-managed identity; `profiles` mirrors it 1:1 via the SCL-005 trigger.
  authUserId: uuid("auth_user_id").unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  instagramHandle: text("instagram_handle"),
  birthday: date("birthday"),
  source: text("source"),
  referrerClientId: uuid("referrer_client_id"),
  styleProfile: text("style_profile"),
  notes: text("notes"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
