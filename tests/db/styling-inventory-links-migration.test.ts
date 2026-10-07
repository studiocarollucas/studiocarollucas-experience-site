// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0053_styling_inventory_links.sql");
const snapshotPath = path.resolve("db/migrations/meta/0053_snapshot.json");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8").toLowerCase() : "";

describe("styling inventory links migration", () => {
  it("adds an optional link, clears it when the item is deleted, and indexes the shoot/item pair", () => {
    expect(sql).toContain('add column "inventory_item_id" uuid');
    expect(sql).toMatch(/foreign key\s*\("inventory_item_id"\) references "public"\."inventory_items"\("id"\) on delete set null/);
    expect(sql).toContain('("shoot_id","inventory_item_id")');
    expect(sql).not.toContain('"inventory_item_id" uuid not null');
  });

  it("keeps the narrow client grants and protects both insert and update against a forged link", () => {
    expect(sql).toContain("before insert or update of inventory_item_id on public.styling_references");
    expect(sql).toContain("tg_op = 'insert' and new.inventory_item_id is not null");
    expect(sql).toContain("new.inventory_item_id is distinct from old.inventory_item_id");
    expect(sql).toContain("auth.uid() is null or not public.is_staff_or_admin()");
    expect(sql).toContain("revoke insert (inventory_item_id), update (inventory_item_id)");
    expect(sql).not.toMatch(/grant\s+(?:all|insert|update|select)\s+on\s+(?:table\s+)?public\.styling_references/);
    expect(sql).not.toContain("drop policy styling_references_client");
  });

  it("uses an invoker trigger with a hardened search path and allows privileged server writes", () => {
    expect(sql).toContain("security invoker");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("current_user in ('postgres', 'service_role')");
    expect(sql).toContain("current_user <> 'authenticated'");
    expect(sql).toContain("errcode = 'insufficient_privilege'");
    expect(sql).toContain("revoke all on function private.guard_styling_inventory_link()");
  });

  it("extends the previous Drizzle snapshot and journal without rewriting integrated migrations", () => {
    expect(fs.existsSync(snapshotPath)).toBe(true);
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const previous = JSON.parse(fs.readFileSync(path.resolve("db/migrations/meta/0052_snapshot.json"), "utf8"));
    const journal = JSON.parse(fs.readFileSync(path.resolve("db/migrations/meta/_journal.json"), "utf8"));
    const table = snapshot.tables["public.styling_references"];
    expect(snapshot.prevId).toBe(previous.id);
    expect(table.columns.inventory_item_id.notNull).toBe(false);
    expect(Object.values(table.foreignKeys)).toContainEqual(expect.objectContaining({ tableTo: "inventory_items", columnsFrom: ["inventory_item_id"], onDelete: "set null" }));
    expect(table.indexes.styling_references_shoot_inventory_item_idx.columns.map((column: { expression: string }) => column.expression)).toEqual(["shoot_id", "inventory_item_id"]);
    expect(journal.entries.at(-1)).toEqual(expect.objectContaining({ idx: 53, tag: "0053_styling_inventory_links" }));
  });
});
