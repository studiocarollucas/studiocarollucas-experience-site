import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const contractorPersonTypeEnum = pgEnum("contractor_person_type", [
  "individual",
  "company",
]);

export const contractorProfiles = pgTable(
  "contractor_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: text("scope").notNull().default("active").unique(),
    personType: contractorPersonTypeEnum("person_type").notNull(),
    legalName: text("legal_name").notNull(),
    document: text("document").notNull(),
    address: text("address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("contractor_profiles_scope_active_check", sql`${table.scope} = 'active'`)],
);

export type ContractorProfile = typeof contractorProfiles.$inferSelect;
export type NewContractorProfile = typeof contractorProfiles.$inferInsert;
