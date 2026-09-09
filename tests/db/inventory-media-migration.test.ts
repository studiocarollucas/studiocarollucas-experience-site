import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0041_inventory_media.sql");
const snapshotPath = path.resolve("db/migrations/meta/0041_snapshot.json");
const journalPath = path.resolve("db/migrations/meta/_journal.json");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8").toLowerCase() : "";

describe("inventory media migration", () => {
  it("creates ordered media that is removed with its inventory item", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(sql).toContain('create table "inventory_media"');
    expect(sql).toContain('"inventory_item_id" uuid not null');
    expect(sql).toContain('"storage_path" text not null');
    expect(sql).toContain('"sort_order" integer default 0 not null');
    expect(sql).toContain('"is_cover" boolean default false not null');
    expect(sql).toContain('"publishable" boolean default false not null');
    expect(sql).toContain('references "public"."inventory_items"("id") on delete cascade');
    expect(sql).toContain('create index "inventory_media_item_sort_idx" on "inventory_media" using btree ("inventory_item_id","sort_order","created_at")');
    expect(sql).toContain('create unique index "inventory_media_one_cover_per_item_idx" on "inventory_media" using btree ("inventory_item_id") where "inventory_media"."is_cover" = true');
  });

  it("keeps media and its bucket private to authenticated staff", () => {
    expect(sql).toContain('alter table "inventory_media" enable row level security');
    expect(sql).toContain('revoke all on table "inventory_media" from anon, authenticated');
    expect(sql).toContain('grant select on table "inventory_media" to authenticated');
    expect(sql).toContain('create policy inventory_media_staff_access on "inventory_media"');
    expect(sql).toContain('using (public.is_staff_or_admin())');
    expect(sql).toContain('with check (public.is_staff_or_admin())');
    expect(sql).toContain("values ('inventory-media', 'inventory-media', false)");
    expect(sql).toContain('create policy inventory_media_objects_staff_access on storage.objects');
    expect(sql).toContain("bucket_id = 'inventory-media' and public.is_staff_or_admin()");
    expect(sql).not.toMatch(/to\s+(?:anon|client)\b/i);
  });

  it("records the schema in the matching snapshot and journal entry", () => {
    expect(fs.existsSync(snapshotPath)).toBe(true);
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

    expect(snapshot.tables["public.inventory_media"]).toBeDefined();
    expect(snapshot.tables["public.inventory_media"].indexes.inventory_media_item_sort_idx).toBeDefined();
    expect(snapshot.tables["public.inventory_media"].indexes.inventory_media_one_cover_per_item_idx).toBeDefined();
    expect(journal.entries).toContainEqual(expect.objectContaining({ idx: 41, tag: "0041_inventory_media" }));
  });
});
