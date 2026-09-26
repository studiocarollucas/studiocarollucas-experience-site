// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// Live-DB tests are opt-in (RUN_LIVE_DB_TESTS=true), never armed by DATABASE_URL
// alone. They expect migration 0050 applied to a dev/staging project and only
// read the catalog, so they never touch real client selections.
const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("gallery selections and downloads (live database)", () => {
  it("enforces one selection per client, gallery and asset", async () => {
    const rows = await db.execute(sql`
      select pg_get_constraintdef(oid) as definition
      from pg_constraint
      where conname = 'photo_selections_client_gallery_asset_unique'
    `);

    expect(Array.from(rows).map((row) => row.definition)).toEqual(["UNIQUE (client_id, gallery_id, asset_id)"]);
  });

  it("blocks downloads by default", async () => {
    const rows = await db.execute(sql`
      select column_default, is_nullable
      from information_schema.columns
      where table_schema = 'public' and table_name = 'galleries' and column_name = 'downloads_enabled'
    `);

    expect(Array.from(rows)).toEqual([{ column_default: "false", is_nullable: "NO" }]);
  });

  it("keeps photo_selections behind RLS with no client write grants", async () => {
    const [table] = Array.from(
      await db.execute(sql`
        select relrowsecurity from pg_class where oid = 'public.photo_selections'::regclass
      `),
    );
    expect(table?.relrowsecurity).toBe(true);

    const grants = await db.execute(sql`
      select grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and table_name = 'photo_selections' and grantee in ('anon', 'authenticated')
    `);
    expect(Array.from(grants)).toEqual([{ grantee: "authenticated", privilege_type: "SELECT" }]);
  });
});
