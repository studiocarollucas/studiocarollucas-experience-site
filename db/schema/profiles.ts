import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "staff", "client"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // matches auth.users.id in Supabase
  role: roleEnum("role").notNull().default("client"),
  fullName: text("full_name"),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
