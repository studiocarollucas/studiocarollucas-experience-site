import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findAdminAuthViolations } from "../../scripts/check-admin-auth.mjs";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "admin-auth-"));
  mkdirSync(join(dir, "(protected)", "clientes"), { recursive: true });
  mkdirSync(join(dir, "login"), { recursive: true });
  mkdirSync(join(dir, "loose"), { recursive: true });

  // compliant: wrapped mutation
  writeFileSync(
    join(dir, "(protected)", "clientes", "actions.ts"),
    `"use server";\nimport { defineAdminAction } from "@/lib/auth/admin-action";\nexport const a = defineAdminAction({ role: "staff" }, async () => null);\n`,
  );
  // compliant: a plain server component page under (protected)
  writeFileSync(join(dir, "(protected)", "clientes", "page.tsx"), `export default function P() { return null; }\n`);
  // compliant: the login page is the one allowed page outside (protected)
  writeFileSync(join(dir, "login", "page.tsx"), `export default function L() { return null; }\n`);
  // VIOLATION: "use server" without defineAdminAction
  writeFileSync(
    join(dir, "(protected)", "clientes", "bad-actions.ts"),
    `"use server";\nexport async function raw(fd: FormData) { return fd; }\n`,
  );
  // VIOLATION: a page outside (protected) that is not login
  writeFileSync(join(dir, "loose", "page.tsx"), `export default function X() { return null; }\n`);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("findAdminAuthViolations", () => {
  it("flags a 'use server' file that never calls defineAdminAction", () => {
    const violations = findAdminAuthViolations(dir);
    expect(violations.some((v) => v.includes("bad-actions.ts"))).toBe(true);
  });

  it("flags a page/route outside the (protected) group that is not login", () => {
    const violations = findAdminAuthViolations(dir);
    expect(violations.some((v) => v.includes("loose/page.tsx"))).toBe(true);
  });

  it("does not flag compliant files", () => {
    const violations = findAdminAuthViolations(dir);
    expect(violations.some((v) => v.includes("clientes/actions.ts"))).toBe(false);
    expect(violations.some((v) => v.includes("login/page.tsx"))).toBe(false);
    expect(violations.some((v) => v.includes("(protected)/clientes/page.tsx"))).toBe(false);
  });

  it("reports the real app/admin tree as clean", () => {
    const real = join(process.cwd(), "app", "admin");
    expect(findAdminAuthViolations(real)).toEqual([]);
  });
});
