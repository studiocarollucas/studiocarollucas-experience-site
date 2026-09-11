import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0046_paixao_clutch_media_provenance.sql");
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";

describe("public clutch media REST provenance boundary", () => {
  it.each(["INSERT", "UPDATE"])("restricts authenticated %s even when staff has a permissive inventory policy", (operation) => {
    const policy = migration.split("--> statement-breakpoint").find((statement) => statement.includes(`FOR ${operation}`)) ?? "";
    expect(policy).toContain('ON public."inventory_items"');
    expect(policy).toContain(`AS RESTRICTIVE FOR ${operation} TO authenticated`);
    expect(policy).toContain("WITH CHECK");
    expect(policy).toContain('NOT "paixao_clutch_published" OR EXISTS');
    expect(policy).toContain('FROM public."inventory_public_media" AS media');
    expect(policy).toContain('media.inventory_item_id = inventory_items.id');
    expect(policy).toContain('media.public_path = inventory_items.paixao_clutch_public_image_path');
    expect(policy).toContain("media.state = 'ready'");
  });

  it("preserves trusted lifecycle writes and registers an additive migration", () => {
    expect(migration).not.toMatch(/FORCE ROW LEVEL SECURITY|GRANT|DISABLE ROW LEVEL SECURITY|DROP POLICY/i);
    const journal = JSON.parse(fs.readFileSync(path.resolve("db/migrations/meta/_journal.json"), "utf8"));
    expect(journal.entries).toContainEqual(expect.objectContaining({ idx: 46, tag: "0046_paixao_clutch_media_provenance" }));
  });
});
