import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.resolve("db/migrations/0045_paixao_clutch_public_media.sql"),
  "utf8"
);

describe("public clutch media migration", () => {
  it("creates a separate public bucket with bounded image uploads and staff-only object changes", () => {
    expect(migration).toContain(
      "VALUES ('paixao-clutch-media', 'paixao-clutch-media', true, 4194304"
    );
    expect(migration).toContain("bucket_id = 'paixao-clutch-media' AND public.is_staff_or_admin()");
    expect(migration).toContain('ALTER TABLE "inventory_public_media" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain(
      'REVOKE ALL ON TABLE "inventory_public_media" FROM anon, authenticated'
    );
    expect(migration).not.toMatch(/UPDATE[\s\S]*?inventory-media[\s\S]*?public\s*=\s*true/i);
  });
  it("despublishes legacy manual image references rather than treating them as confirmed media", () => {
    expect(migration).toMatch(
      /UPDATE "inventory_items" SET "paixao_clutch_published" = false, "paixao_clutch_public_image_path" = NULL/
    );
  });
  it("records lifecycle constraints and the migration journal", () => {
    const snapshot = JSON.parse(
      fs.readFileSync(path.resolve("db/migrations/meta/0045_snapshot.json"), "utf8")
    );
    expect(snapshot.tables["public.inventory_public_media"].columns.state.default).toBe(
      "'pending'"
    );
    expect(migration).toContain("inventory_public_media_one_ready_per_item_idx");
    const journal = JSON.parse(
      fs.readFileSync(path.resolve("db/migrations/meta/_journal.json"), "utf8")
    );
    expect(journal.entries).toContainEqual(
      expect.objectContaining({ idx: 45, tag: "0045_paixao_clutch_public_media" })
    );
  });
});
