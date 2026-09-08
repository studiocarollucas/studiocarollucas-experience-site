import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0035_contractor_profiles.sql");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";

describe("contractor profiles migration", () => {
  it("creates the individual/company profile enum and a single active profile", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(sql).toMatch(/create type .*contractor_person_type.*enum\s*\('individual', 'company'\)/i);
    expect(sql).toMatch(/create table .*contractor_profiles/i);
    expect(sql).toMatch(/scope.*text.*default 'active'.*not null/i);
    expect(sql).toMatch(/contractor_profiles_scope_active_check.*check.*scope.*= 'active'/i);
    expect(sql).toMatch(/contractor_profiles_scope_unique.*unique.*scope/i);
  });

  it("limits profile access to authenticated staff and admins", () => {
    expect(sql).toContain("alter table public.contractor_profiles enable row level security;");
    expect(sql).toContain("revoke all on table public.contractor_profiles from anon, authenticated;");
    expect(sql).toContain("grant select, insert, update on table public.contractor_profiles to authenticated;");
    expect(sql).toContain("create policy contractor_profiles_staff_access on public.contractor_profiles");
    expect(sql).toContain("using (public.is_staff_or_admin())");
    expect(sql).toContain("with check (public.is_staff_or_admin())");
  });

  it("upgrades legacy contractor snapshots without changing the other snapshot fields", () => {
    expect(sql).toContain("jsonb_set(");
    expect(sql).toContain("'{contractor}'");
    expect(sql).toContain("'personType', 'individual'");
    expect(sql).toContain("'legalName', snapshot->'contractor'->'name'");
    expect(sql).toContain("'document', snapshot->'contractor'->'cpf'");
    expect(sql).toContain("'address', snapshot->'contractor'->'address'");
    expect(sql).toContain("where snapshot->'contractor' ? 'name'");
  });
});
