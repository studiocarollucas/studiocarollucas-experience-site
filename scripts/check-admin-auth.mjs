import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** @param {string} absDir @returns {string[]} */
function walk(absDir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(absDir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = join(absDir, entry);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(abs);
  }
  return out;
}

/**
 * Enforces the Studio OS authorization boundary structurally:
 *  1. Any file declaring "use server" must route every action through
 *     defineAdminAction() (lib/auth/admin-action.ts).
 *  2. Any page/layout/route must live under the (protected) route group, whose
 *     layout.tsx runs the requireRole guard.
 * app/admin/login is exempt from both: it is the unauthenticated entry point, so
 * its sign-in server action has no CurrentUser to route through the RBAC wrapper
 * and its page renders before any role exists.
 * @param {string} adminDir absolute path to an app/admin directory
 * @returns {string[]} human-readable violation messages (empty = clean)
 */
export function findAdminAuthViolations(adminDir) {
  const violations = [];
  for (const abs of walk(adminDir)) {
    const rel = relative(adminDir, abs).replace(/\\/g, "/");
    const isLogin = rel.startsWith("login/");
    if (isLogin) continue;
    const src = readFileSync(abs, "utf-8");

    if (/^\s*["']use server["']\s*;?\s*$/m.test(src) && !/\bdefineAdminAction\s*\(/.test(src)) {
      violations.push(
        `${rel}: declares "use server" but never calls defineAdminAction() — every Studio OS mutation must go through the RBAC wrapper (lib/auth/admin-action.ts).`,
      );
    }

    const isPageOrRoute = /(^|\/)(page|layout|route)\.(ts|tsx)$/.test(rel);
    const inProtected = rel.startsWith("(protected)/") || rel === "(protected)/layout.tsx";
    if (isPageOrRoute && !inProtected) {
      violations.push(
        `${rel}: a Studio OS page/route outside the (protected) group — it would render without the role guard in app/admin/(protected)/layout.tsx. Move it under (protected).`,
      );
    }
  }
  return violations;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const adminDir = join(process.cwd(), "app", "admin");
  const violations = findAdminAuthViolations(adminDir);
  if (violations.length > 0) {
    console.error("Studio OS auth-enforcement check FAILED:\n" + violations.map((v) => "  - " + v).join("\n"));
    process.exit(1);
  }
  console.log("Studio OS auth-enforcement check: all admin pages guarded, all mutations wrapped. OK.");
}
