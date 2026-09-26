import { boolean, index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { clients } from "./clients";
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
  // SCL-505: downloads are blocked until staff explicitly allows them per Gallery.
  downloadsEnabled: boolean("downloads_enabled").notNull().default(false),
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

// SCL-504 (PRD: PhotoSelection). One row per client/gallery/asset; the domain
// always derives gallery_id from the authorized asset, never from the browser.
export const photoSelections = pgTable(
  "photo_selections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => galleryAssets.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("photo_selections_client_gallery_asset_unique").on(table.clientId, table.galleryId, table.assetId),
    index("photo_selections_gallery_asset_idx").on(table.galleryId, table.assetId),
  ],
);

export type Gallery = typeof galleries.$inferSelect;
export type GalleryAsset = typeof galleryAssets.$inferSelect;
export type PhotoSelection = typeof photoSelections.$inferSelect;
