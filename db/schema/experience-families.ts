import { boolean, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const experienceFamilies = pgTable(
  "experience_families",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("experience_families_slug_unique").on(table.slug)],
);

export type ExperienceFamily = typeof experienceFamilies.$inferSelect;
export type NewExperienceFamily = typeof experienceFamilies.$inferInsert;
