import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.resolve("db/migrations/0027_styling_storage_access.sql"),
  "utf8",
);

describe("styling migrations", () => {
  it("creates a private, restricted 8 MB bucket", () => {
    expect(sql).toContain("'styling-references', 'styling-references', false, 8388608");
    expect(sql).toContain("array['image/jpeg', 'image/png', 'image/webp']");
  });

  it("enforces ownership for rows and object paths", () => {
    expect(sql).toContain("public.owns_portal_shoot(shoot_id)");
    expect(sql).toContain("split_part(name, '/', 1) = auth.uid()::text");
    expect(sql).toContain("uploaded_by_auth_user_id = auth.uid()");
    expect(sql).toContain("split_part(storage_path, '/', 1) = auth.uid()::text");
    expect(sql).toContain("split_part(storage_path, '/', 2) = shoot_id::text");
  });

  it("keeps security-definer helpers outside the exposed public schema", () => {
    expect(sql).toContain("private.owns_styling_object(name)");
    expect(sql).toContain("security definer\nset search_path = ''");
    expect(sql).toContain("grant usage on schema private to authenticated");
    expect(sql).toContain(
      "grant execute on function private.owns_styling_object(text) to authenticated",
    );
    expect(sql).not.toContain("function public.owns_styling_object");
    expect(sql).not.toContain("function public.enforce_styling_reference_limit");
  });

  it("removes default client grants before granting the narrow surface", () => {
    expect(sql).toContain(
      "revoke all on table public.styling_references from anon, authenticated",
    );
    expect(sql).toContain("grant select (id, shoot_id, storage_path, caption, origin");
    expect(sql).toContain("grant insert (shoot_id, storage_path, caption, origin");
    expect(sql).not.toContain("grant update on table public.styling_references");
  });

  it("enforces the 20-reference limit under concurrent inserts", () => {
    expect(sql).toContain("styling_references_limit");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain(">= 20");
  });
});
