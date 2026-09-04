import { pgTable, uuid, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const experiencePackages = pgTable("experience_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  includedPhotos: integer("included_photos").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  scenes: text("scenes"),
  makeIncluded: boolean("make_included").notNull().default(false),
  outfitsLimit: integer("outfits_limit"),
  clutchIncluded: boolean("clutch_included").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ExperiencePackage = typeof experiencePackages.$inferSelect;
export type NewExperiencePackage = typeof experiencePackages.$inferInsert;
