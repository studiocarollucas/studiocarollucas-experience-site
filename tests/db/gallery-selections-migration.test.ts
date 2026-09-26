import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0050_gallery_selections_downloads.sql");
const snapshotPath = path.resolve("db/migrations/meta/0050_snapshot.json");
const previousSnapshotPath = path.resolve("db/migrations/meta/0049_snapshot.json");
const journalPath = path.resolve("db/migrations/meta/_journal.json");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
const normalizedSql = sql.toLowerCase().replace(/\s+/g, " ");

describe("gallery selections and downloads migration", () => {
  it("creates photo_selections unique per client, gallery and asset", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(normalizedSql).toContain('create table "photo_selections"');
    expect(normalizedSql).toContain('"client_id" uuid not null');
    expect(normalizedSql).toContain('"gallery_id" uuid not null');
    expect(normalizedSql).toContain('"asset_id" uuid not null');
    expect(normalizedSql).toContain(
      'constraint "photo_selections_client_gallery_asset_unique" unique("client_id","gallery_id","asset_id")',
    );
    expect(normalizedSql).toContain(
      'create index "photo_selections_gallery_asset_idx" on "photo_selections" using btree ("gallery_id","asset_id")',
    );
  });

  it("cascades selections with their gallery, asset and client", () => {
    expect(normalizedSql).toContain(
      'alter table "photo_selections" add constraint "photo_selections_gallery_id_galleries_id_fk" foreign key ("gallery_id") references "public"."galleries"("id") on delete cascade on update no action',
    );
    expect(normalizedSql).toContain(
      'alter table "photo_selections" add constraint "photo_selections_asset_id_gallery_assets_id_fk" foreign key ("asset_id") references "public"."gallery_assets"("id") on delete cascade on update no action',
    );
    expect(normalizedSql).toContain(
      'alter table "photo_selections" add constraint "photo_selections_client_id_clients_id_fk" foreign key ("client_id") references "public"."clients"("id") on delete cascade on update no action',
    );
  });

  it("adds a per-gallery download switch that is blocked by default", () => {
    expect(normalizedSql).toContain('alter table "galleries" add column "downloads_enabled" boolean default false not null;');
  });

  it("keeps selections server-written: RLS on, staff-only read, no client grants to write", () => {
    expect(normalizedSql).toContain('alter table "photo_selections" enable row level security;');
    expect(normalizedSql).toContain('revoke all on table "photo_selections" from anon, authenticated;');
    expect(normalizedSql).toContain('grant select on table "photo_selections" to authenticated;');
    expect(normalizedSql).not.toMatch(/grant [a-z, ]*(insert|update|delete)[a-z, ]* on table "photo_selections"/);
    expect(normalizedSql).toContain(
      'create policy photo_selections_staff_access on "photo_selections" for select to authenticated using (public.is_staff_or_admin());',
    );
    expect(normalizedSql).not.toContain("to anon");
  });

  it("records the new table and column in the chained snapshot and journal", () => {
    expect(fs.existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const previous = JSON.parse(fs.readFileSync(previousSnapshotPath, "utf8"));
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
    const selections = snapshot.tables["public.photo_selections"];
    const galleries = snapshot.tables["public.galleries"];

    expect(snapshot.prevId).toBe(previous.id);
    expect(snapshot.id).not.toBe(previous.id);
    const previousKeys = Object.keys(previous.tables);
    const assetsIndex = previousKeys.indexOf("public.gallery_assets");
    expect(Object.keys(snapshot.tables)).toEqual([
      ...previousKeys.slice(0, assetsIndex + 1),
      "public.photo_selections",
      ...previousKeys.slice(assetsIndex + 1),
    ]);
    expect(Object.keys(galleries.columns)).toEqual([...Object.keys(previous.tables["public.galleries"].columns), "downloads_enabled"]);
    expect(galleries.columns.downloads_enabled).toMatchObject({ type: "boolean", notNull: true, default: false });
    expect(selections.uniqueConstraints.photo_selections_client_gallery_asset_unique.columns).toEqual([
      "client_id",
      "gallery_id",
      "asset_id",
    ]);
    expect(Object.keys(selections.foreignKeys)).toEqual([
      "photo_selections_gallery_id_galleries_id_fk",
      "photo_selections_asset_id_gallery_assets_id_fk",
      "photo_selections_client_id_clients_id_fk",
    ]);
    expect(
      selections.indexes.photo_selections_gallery_asset_idx.columns.map((c: { expression: string }) => c.expression),
    ).toEqual(["gallery_id", "asset_id"]);

    const last = journal.entries[journal.entries.length - 1];
    expect(last).toMatchObject({ idx: 50, version: "7", tag: "0050_gallery_selections_downloads", breakpoints: true });
    expect(last.when).toBeGreaterThan(journal.entries[journal.entries.length - 2].when);
  });
});
