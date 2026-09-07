import { pgTable, uuid, text, integer, numeric, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { experienceFamilies } from "./experience-families.ts";

export const experiencePackages = pgTable(
  "experience_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id").references(() => experienceFamilies.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
    includedPhotos: integer("included_photos").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    scenes: text("scenes"),
    sceneCount: integer("scene_count"),
    makeIncluded: boolean("make_included").notNull().default(false),
    hairIncluded: boolean("hair_included").notNull().default(false),
    outfitsLimit: integer("outfits_limit"),
    participantLimit: integer("participant_limit"),
    videoCount: integer("video_count").notNull().default(0),
    clutchIncluded: boolean("clutch_included").notNull().default(false),
    paletteEligible: boolean("palette_eligible").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    published: boolean("published").notNull().default(false),
    quizEligible: boolean("quiz_eligible").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("experience_packages_family_name_unique").on(table.familyId, table.name)],
);

export type ExperiencePackage = typeof experiencePackages.$inferSelect;
export type NewExperiencePackage = typeof experiencePackages.$inferInsert;
