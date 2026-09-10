import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { shoots } from "./shoots";

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

export const inventoryReservationPurposeValues = ["shoot", "rental"] as const;
export const inventoryReservationStatusValues = [
  "pending",
  "confirmed",
  "cancelled",
  "released",
] as const;

export const inventoryReservationPurposeEnum = pgEnum(
  "inventory_reservation_purpose",
  inventoryReservationPurposeValues,
);

export const inventoryReservationStatusEnum = pgEnum(
  "inventory_reservation_status",
  inventoryReservationStatusValues,
);

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
  rentalPrice: numeric("rental_price", { precision: 10, scale: 2 }),
  replacementValue: numeric("replacement_value", { precision: 10, scale: 2 }),
  paixaoClutchCopy: text("paixao_clutch_copy"),
  paixaoClutchEligible: boolean("paixao_clutch_eligible").notNull().default(false),
  paixaoClutchPublicImagePath: text("paixao_clutch_public_image_path"),
  paixaoClutchPublished: boolean("paixao_clutch_published").notNull().default(false),
  paixaoClutchFeatured: boolean("paixao_clutch_featured").notNull().default(false),
  paixaoClutchSortOrder: integer("paixao_clutch_sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check(
    "inventory_items_rental_price_nonnegative",
    sql`${table.rentalPrice} is null or ${table.rentalPrice} >= 0`,
  ),
  check(
    "inventory_items_replacement_value_nonnegative",
    sql`${table.replacementValue} is null or ${table.replacementValue} >= 0`,
  ),
  check(
    "inventory_items_paixao_clutch_sort_order_nonnegative",
    sql`${table.paixaoClutchSortOrder} >= 0`,
  ),
  check(
    "inventory_items_paixao_clutch_only",
    sql`${table.type} = 'clutch' or (
      ${table.rentalPrice} is null
      and ${table.replacementValue} is null
      and ${table.paixaoClutchCopy} is null
      and ${table.paixaoClutchPublicImagePath} is null
      and ${table.paixaoClutchPublished} = false
      and ${table.paixaoClutchEligible} = false
      and ${table.paixaoClutchFeatured} = false
      and ${table.paixaoClutchSortOrder} = 0
    )`,
  ),
  check(
    "inventory_items_paixao_clutch_publication_valid",
    sql`${table.paixaoClutchPublished} = false or (
      ${table.type} = 'clutch'
      and ${table.paixaoClutchEligible} = true
      and ${table.active} = true
      and ${table.status} = 'available'
      and ${table.rentalPrice} is not null
      and nullif(btrim(${table.paixaoClutchCopy}), '') is not null
      and nullif(btrim(${table.paixaoClutchPublicImagePath}), '') is not null
    )`,
  ),
]);

export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id),
    shootId: uuid("shoot_id").notNull().references(() => shoots.id),
    purpose: inventoryReservationPurposeEnum("purpose").notNull().default("shoot"),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    status: inventoryReservationStatusEnum("status").notNull().default("pending"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledByUserId: uuid("cancelled_by_user_id").references(() => profiles.id),
    overrideReason: text("override_reason"),
    overriddenByUserId: uuid("overridden_by_user_id").references(() => profiles.id),
    overriddenAt: timestamp("overridden_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "inventory_reservations_dates_valid",
      sql`${table.endsOn} >= ${table.startsOn}`,
    ),
    index("inventory_reservations_blocking_item_dates_idx")
      .on(table.inventoryItemId, table.startsOn, table.endsOn)
      .where(sql`${table.status} in ('pending', 'confirmed')`),
    index("inventory_reservations_shoot_dates_idx").on(table.shootId, table.startsOn),
  ],
);

export const inventoryMedia = pgTable(
  "inventory_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull().unique("inventory_media_storage_path_unique"),
    sortOrder: integer("sort_order").notNull().default(0),
    isCover: boolean("is_cover").notNull().default(false),
    publishable: boolean("publishable").notNull().default(false),
    deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_media_item_sort_idx").on(
      table.inventoryItemId,
      table.sortOrder,
      table.createdAt,
    ),
    uniqueIndex("inventory_media_one_cover_per_item_idx")
      .on(table.inventoryItemId)
      .where(sql`${table.isCover} = true`),
  ],
);

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
export type InventoryReservation = typeof inventoryReservations.$inferSelect;
export type NewInventoryReservation = typeof inventoryReservations.$inferInsert;
export type InventoryMedia = typeof inventoryMedia.$inferSelect;
export type NewInventoryMedia = typeof inventoryMedia.$inferInsert;
