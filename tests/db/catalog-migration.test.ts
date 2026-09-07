import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = fs
  .readdirSync(path.resolve("db/migrations"))
  .find((name) => name.startsWith("0032_"));
const sql = migrationPath
  ? fs.readFileSync(path.resolve("db/migrations", migrationPath), "utf8")
  : "";
const followupPath = fs
  .readdirSync(path.resolve("db/migrations"))
  .find((name) => name.startsWith("0033_"));
const followupSql = followupPath
  ? fs.readFileSync(path.resolve("db/migrations", followupPath), "utf8")
  : "";

describe("catalog families migration", () => {
  it("creates families and preserves existing packages", () => {
    expect(sql).toMatch(/create table "experience_families"/i);
    expect(sql).toMatch(/add column "family_id"/i);
    expect(sql).toMatch(/on delete restrict/i);
    expect(sql).not.toMatch(/delete from\s+"experience_packages"/i);
  });

  it("restricts family access to staff and admins", () => {
    expect(sql).toMatch(/alter table "experience_families" enable row level security/i);
    expect(sql).toContain("public.is_staff_or_admin()");
  });

  it("removes the obsolete global package-name unique constraint", () => {
    expect(followupSql).toMatch(/drop constraint "experience_packages_name_unique"/i);
  });
});
