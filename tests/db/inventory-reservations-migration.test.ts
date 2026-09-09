import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0039_inventory_reservations.sql");
const historyIndexMigrationPath = path.resolve("db/migrations/0040_inventory_reservations_history_index.sql");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
const normalizedSql = sql.toLowerCase();

describe("inventory reservations migration", () => {
  it("creates the reservation table with interval safety and blocking-status index", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(normalizedSql).toContain('create type "public"."inventory_reservation_purpose" as enum(\'shoot\', \'rental\')');
    expect(normalizedSql).toContain('create type "public"."inventory_reservation_status" as enum(\'pending\', \'confirmed\', \'cancelled\', \'released\')');
    expect(normalizedSql).toContain('constraint "inventory_reservations_dates_valid" check ("inventory_reservations"."ends_on" >= "inventory_reservations"."starts_on")');
    expect(normalizedSql).toContain('create index "inventory_reservations_blocking_item_dates_idx" on "inventory_reservations" using btree ("inventory_item_id","starts_on","ends_on") where "inventory_reservations"."status" in (\'pending\', \'confirmed\');');
  });

  it("indexes reservation history by shoot and start date", () => {
    expect(fs.readFileSync(historyIndexMigrationPath, "utf8").toLowerCase()).toContain('create index "inventory_reservations_shoot_dates_idx" on "inventory_reservations" using btree ("shoot_id","starts_on");');
  });

  it("limits access to authenticated staff and protects enum access", () => {
    expect(normalizedSql).toContain('alter table "inventory_reservations" enable row level security;');
    expect(normalizedSql).toContain('revoke all on table "inventory_reservations" from anon, authenticated;');
    expect(normalizedSql).toContain('grant select, insert, update, delete on table "inventory_reservations" to authenticated;');
    expect(normalizedSql).toContain("create policy inventory_reservations_staff_access");
    expect(normalizedSql).toContain("using (public.is_staff_or_admin())");
    expect(normalizedSql).toContain("with check (public.is_staff_or_admin())");
    for (const enumName of ["inventory_reservation_purpose", "inventory_reservation_status"]) {
      expect(normalizedSql).toContain(`revoke all on type public.${enumName} from public, anon, authenticated;`);
      expect(normalizedSql).toContain(`grant usage on type public.${enumName} to authenticated, service_role;`);
    }
  });
});
