import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const stylingReferenceOriginEnum = pgEnum("styling_reference_origin", [
  "client",
  "studio",
]);

export const stylingReferences = pgTable("styling_references", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootId: uuid("shoot_id").notNull(),
  storagePath: text("storage_path").notNull().unique(),
  caption: text("caption"),
  origin: stylingReferenceOriginEnum("origin").notNull(),
  uploadedByAuthUserId: uuid("uploaded_by_auth_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export type StylingReference = typeof stylingReferences.$inferSelect;
export type NewStylingReference = typeof stylingReferences.$inferInsert;
