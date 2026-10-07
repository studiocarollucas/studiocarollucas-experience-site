import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { inventoryItems } from "./inventory";

export const stylingReferenceOriginEnum = pgEnum("styling_reference_origin", [
  "client",
  "studio",
]);

export const stylingReferences = pgTable("styling_references", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootId: uuid("shoot_id").notNull(),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
  storagePath: text("storage_path").notNull().unique(),
  caption: text("caption"),
  origin: stylingReferenceOriginEnum("origin").notNull(),
  uploadedByAuthUserId: uuid("uploaded_by_auth_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("styling_references_shoot_inventory_item_idx").on(table.shootId, table.inventoryItemId),
]);

export type StylingReference = typeof stylingReferences.$inferSelect;
export type NewStylingReference = typeof stylingReferences.$inferInsert;
