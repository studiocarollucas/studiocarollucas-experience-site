import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  galleries,
  galleryAssets,
  galleryStatusValues,
  type Gallery,
  type GalleryAsset,
} from "@/db/schema";

const migrationPath = path.resolve("db/migrations/0036_gallery_foundation.sql");
const migrationSql = fs.existsSync(migrationPath)
  ? fs.readFileSync(migrationPath, "utf8").replace(/\r\n/g, "\n")
  : "";

describe("gallery schema", () => {
  it("exports the private gallery status contract", () => {
    expect(galleryStatusValues).toEqual(["draft", "published"]);
  });

  it("models one Gallery per Shoot with creation metadata", () => {
    expect(Object.keys(galleries)).toEqual(
      expect.arrayContaining(["id", "shootId", "status", "createdAt"]),
    );
    expect(galleries.shootId.isUnique).toBe(true);

    const gallery: Gallery | undefined = undefined;
    expect(gallery).toBeUndefined();
  });

  it("stores ordered private asset paths for a Gallery", () => {
    expect(Object.keys(galleryAssets)).toEqual(
      expect.arrayContaining(["id", "galleryId", "storagePath", "sortOrder", "createdAt"]),
    );
    expect(galleryAssets.storagePath.isUnique).toBe(true);
    expect(galleryAssets.sortOrder.default).toBe(0);

    const asset: GalleryAsset | undefined = undefined;
    expect(asset).toBeUndefined();
  });
});

describe("gallery foundation migration", () => {
  it("creates the Gallery and GalleryAsset relationships", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(migrationSql).toMatch(/create table "galleries"/i);
    expect(migrationSql).toMatch(/create table "gallery_assets"/i);
    expect(migrationSql).toMatch(/"galleries_shoot_id_unique" unique\("shoot_id"\)/i);
    expect(migrationSql).toMatch(/references "public"\."shoots"\("id"\) on delete cascade/i);
    expect(migrationSql).toMatch(/references "public"\."galleries"\("id"\) on delete cascade/i);
  });

  it("limits both tables to authenticated staff and admins", () => {
    expect(migrationSql).toContain("alter table public.galleries enable row level security");
    expect(migrationSql).toContain("alter table public.gallery_assets enable row level security");
    expect(migrationSql).toContain("create policy galleries_staff_access on public.galleries");
    expect(migrationSql).toContain("create policy gallery_assets_staff_access on public.gallery_assets");
    expect(migrationSql.match(/public\.is_staff_or_admin\(\)/g)).toHaveLength(6);
  });

  it("creates and preserves a private staff-only Storage bucket", () => {
    expect(migrationSql).toContain("'gallery-assets', 'gallery-assets', false");
    expect(migrationSql).toContain("on conflict (id) do update set public = false");
    expect(migrationSql).toContain("create policy gallery_assets_objects_staff_access on storage.objects");
    expect(migrationSql).toContain("bucket_id = 'gallery-assets' and public.is_staff_or_admin()");
    expect(migrationSql).not.toMatch(/public\s*=\s*true/i);
  });
});
