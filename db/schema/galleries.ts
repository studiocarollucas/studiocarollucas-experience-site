import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { shoots } from "./shoots";

export const galleryStatusValues = ["draft", "published"] as const;
export const galleryStatusEnum = pgEnum("gallery_status", galleryStatusValues);

export const galleries = pgTable("galleries", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootId: uuid("shoot_id")
    .notNull()
    .references(() => shoots.id, { onDelete: "cascade" })
    .unique("galleries_shoot_id_unique"),
  status: galleryStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const galleryAssets = pgTable(
  "gallery_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull().unique("gallery_assets_storage_path_unique"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("gallery_assets_gallery_sort_idx").on(
      table.galleryId,
      table.sortOrder,
      table.createdAt,
    ),
  ],
);

export type Gallery = typeof galleries.$inferSelect;
export type GalleryAsset = typeof galleryAssets.$inferSelect;
