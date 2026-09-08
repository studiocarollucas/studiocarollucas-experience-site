import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0034_contracts.sql");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";

describe("contracts migration", () => {
  it("adds optional client civil fields", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(sql).toContain("alter table public.clients add column cpf text;");
    expect(sql).toContain("alter table public.clients add column address_street text;");
    expect(sql).toContain("alter table public.clients add column address_postal_code text;");
  });

  it("restricts contract table access to authenticated staff", () => {
    expect(sql).toContain("alter table public.contracts enable row level security;");
    expect(sql).toContain("revoke all on table public.contracts from anon, authenticated;");
    expect(sql).toContain("grant select, insert on table public.contracts to authenticated;");
    expect(sql).toContain("create policy contracts_staff_access on public.contracts");
    expect(sql).toContain("using (public.is_staff_or_admin())");
    expect(sql).toContain("with check (public.is_staff_or_admin())");
  });

  it("creates a private contracts bucket without client or anonymous access", () => {
    expect(sql).toContain("values ('contracts', 'contracts', false)");
    expect(sql).toContain("create policy contracts_objects_staff_access on storage.objects");
    expect(sql).not.toMatch(/to\s+(?:anon|client)\b/i);
  });

  it("contains no real civil identity literals", () => {
    expect(sql).not.toMatch(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
    expect(sql).not.toMatch(/\b(?:rua|avenida|av\.)\s+[^\s;]+/i);
  });
});
