import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.resolve("db/migrations/0027_styling_storage_access.sql"),
  "utf8",
);
const hardeningSql = fs.readFileSync(
  path.resolve("db/migrations/0028_harden_styling_paths.sql"),
  "utf8",
);
const reservationSqlPath = path.resolve("db/migrations/0029_styling_upload_reservations.sql");
const reservationSql = fs.existsSync(reservationSqlPath)
  ? fs.readFileSync(reservationSqlPath, "utf8")
  : "";
const deletionGuardSqlPath = path.resolve("db/migrations/0030_guard_styling_row_deletion.sql");
const deletionGuardSql = fs.existsSync(deletionGuardSqlPath)
  ? fs.readFileSync(deletionGuardSqlPath, "utf8")
  : "";
const serializationSqlPath = path.resolve("db/migrations/0031_serialize_styling_lifecycle.sql");
const serializationSql = fs.existsSync(serializationSqlPath)
  ? fs.readFileSync(serializationSqlPath, "utf8")
  : "";

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

describe("styling path hardening migration", () => {
  it("defines one reusable canonical three-segment path predicate", () => {
    expect(hardeningSql).toContain("function private.is_canonical_styling_path(");
    expect(hardeningSql).toContain("pg_catalog.string_to_array(object_name, '/')");
    expect(hardeningSql).toContain(
      "pg_catalog.array_length(path_parts, 1) is distinct from 3",
    );
    expect(hardeningSql).toContain("path_parts[3] in ('.', '..')");
    expect(hardeningSql).toContain(
      "private.is_canonical_styling_path(storage_path, auth.uid(), shoot_id)",
    );
    expect(hardeningSql).toContain(
      "private.is_canonical_styling_path(name, auth.uid(), null::uuid)",
    );
  });

  it("makes object ownership fail closed on non-canonical paths", () => {
    expect(hardeningSql).toContain(
      "not private.is_canonical_styling_path(object_name, null::uuid, null::uuid)",
    );
    expect(hardeningSql).toContain("create or replace function private.owns_styling_object");
  });

  it("lets clients delete only client-origin rows they uploaded", () => {
    expect(hardeningSql).toContain("drop policy styling_references_client_delete");
    expect(hardeningSql).toContain("and origin = 'client'");
    expect(hardeningSql).toContain("and uploaded_by_auth_user_id = auth.uid()");
  });

  it("preserves private helper ACLs", () => {
    expect(hardeningSql).toContain("security invoker");
    expect(hardeningSql).toContain("set search_path = ''");
    expect(hardeningSql).toContain(
      "revoke all on function private.is_canonical_styling_path(text, uuid, uuid)",
    );
    expect(hardeningSql).toContain(
      "grant execute on function private.is_canonical_styling_path(text, uuid, uuid) to authenticated",
    );
  });
});

describe("styling upload reservation migration", () => {
  it("requires a matching metadata row before client or staff Storage inserts", () => {
    expect(reservationSql).toContain("function private.has_styling_reference(");
    expect(reservationSql).toContain("where storage_path = object_name");
    expect(reservationSql).toContain("uploaded_by_auth_user_id = expected_uploader_id");
    expect(reservationSql).toContain(
      "private.has_styling_reference(name, auth.uid())",
    );
    expect(reservationSql).toContain("drop policy styling_objects_client_insert");
    expect(reservationSql).toContain("drop policy styling_objects_staff_access");
  });
});

describe("styling row deletion guard migration", () => {
  it("allows a client row deletion only after its Storage object is absent", () => {
    expect(deletionGuardSql).toContain("function private.styling_object_is_absent(");
    expect(deletionGuardSql).toContain("from storage.objects");
    expect(deletionGuardSql).toContain("bucket_id = 'styling-references'");
    expect(deletionGuardSql).toContain("private.styling_object_is_absent(storage_path)");
    expect(deletionGuardSql).toContain("drop policy styling_references_client_delete");
    expect(deletionGuardSql).toContain("union");
    expect(deletionGuardSql).toContain("select objects.name");
    expect(deletionGuardSql).toContain("pg_catalog.split_part(objects.name, '/', 2)");
  });

  it("keeps the object lookup helper private and locked down", () => {
    expect(deletionGuardSql).toContain("security definer");
    expect(deletionGuardSql).toContain("set search_path = ''");
    expect(deletionGuardSql).toContain(
      "revoke all on function private.styling_object_is_absent(text)",
    );
    expect(deletionGuardSql).toContain(
      "grant execute on function private.styling_object_is_absent(text) to authenticated",
    );
  });
});

describe("styling lifecycle serialization migration", () => {
  it("takes the shoot advisory lock in upload and row-deletion policy helpers", () => {
    expect(serializationSql).toContain("function private.has_styling_reference(");
    expect(serializationSql).toContain("function private.styling_object_is_absent(");
    expect(serializationSql.match(/pg_advisory_xact_lock/g)).toHaveLength(2);
    expect(serializationSql.match(/language plpgsql/g)).toHaveLength(2);
    expect(serializationSql.match(/volatile/g)).toHaveLength(2);
  });
});
