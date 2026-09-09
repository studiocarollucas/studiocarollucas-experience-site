import { boolean, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const inventoryItemTypeEnum = pgEnum("inventory_item_type", [
  "outfit",
  "clutch",
  "accessory",
  "prop",
]);

export const inventoryItemStatusEnum = pgEnum("inventory_item_status", [
  "available",
  "maintenance",
  "retired",
]);

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: inventoryItemTypeEnum("type").notNull(),
  color: text("color"),
  size: text("size"),
  status: inventoryItemStatusEnum("status").notNull().default("available"),
  active: boolean("active").notNull().default(true),
  internalPrice: numeric("internal_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
