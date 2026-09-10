import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0043_paixao_clutch_curation.sql");
const snapshotPath = path.resolve("db/migrations/meta/0043_snapshot.json");
const journalPath = path.resolve("db/migrations/meta/_journal.json");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8").toLowerCase() : "";

describe("Paixão Clutch curation migration", () => {
  it("adds the editorial and commercial fields to inventory items", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    for (const column of [
      "rental_price",
      "replacement_value",
      "paixao_clutch_copy",
      "paixao_clutch_public_image_path",
      "paixao_clutch_published",
      "paixao_clutch_featured",
      "paixao_clutch_sort_order",
    ]) {
      expect(sql).toContain(`\"${column}\"`);
    }
    expect(sql).toContain('"inventory_items"."rental_price" is null or "inventory_items"."rental_price" >= 0');
    expect(sql).toContain('"inventory_items"."replacement_value" is null or "inventory_items"."replacement_value" >= 0');
    expect(sql).toContain('"inventory_items_paixao_clutch_only"');
    expect(sql).toContain('"inventory_items_paixao_clutch_publication_valid"');
  });

  it("records the schema in the matching snapshot and journal entry", () => {
    expect(fs.existsSync(snapshotPath)).toBe(true);
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

    expect(snapshot.prevId).toBeDefined();
    expect(snapshot.tables["public.inventory_items"].columns.rental_price).toBeDefined();
    expect(snapshot.tables["public.inventory_items"].columns.replacement_value).toBeDefined();
    expect(snapshot.tables["public.inventory_items"].checkConstraints.inventory_items_paixao_clutch_only).toBeDefined();
    expect(snapshot.tables["public.inventory_items"].checkConstraints.inventory_items_paixao_clutch_publication_valid).toBeDefined();
    expect(journal.entries).toContainEqual(expect.objectContaining({ idx: 43, tag: "0043_paixao_clutch_curation" }));
  });
});
