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
 * app/admin/login is the unauthenticated entry point, so it is exempt — but the two
 * rules are exempted at different scopes. The page/route rule is exempt for the
 * whole login/ subtree (nothing under it can render with a role). The "use server"
 * rule is exempt for exactly login/actions.ts and login/page.tsx: those are the
 * sign-in files that genuinely have no CurrentUser to route through the wrapper.
 * A subtree-wide exemption there would have let any future login/**\/actions.ts
 * ship an unwrapped mutation — a real hole, since the guard is the only thing
 * enforcing the wrapper.
 * @param {string} adminDir absolute path to an app/admin directory
 * @returns {string[]} human-readable violation messages (empty = clean)
 */
export function findAdminAuthViolations(adminDir) {
  const violations = [];
  for (const abs of walk(adminDir)) {
    const rel = relative(adminDir, abs).replace(/\\/g, "/");
    const inLoginSubtree = rel.startsWith("login/");
    const isSignInFile = rel === "login/actions.ts" || rel === "login/page.tsx";
    const src = readFileSync(abs, "utf-8");

    if (
      !isSignInFile &&
      /^\s*["']use server["']\s*;?\s*$/m.test(src) &&
      !/\bdefineAdminAction\s*\(/.test(src)
    ) {
      violations.push(
        `${rel}: declares "use server" but never calls defineAdminAction() — every Studio OS mutation must go through the RBAC wrapper (lib/auth/admin-action.ts).`,
      );
    }

    const isPageOrRoute = /(^|\/)(page|layout|route)\.(ts|tsx)$/.test(rel);
    const inProtected = rel.startsWith("(protected)/") || rel === "(protected)/layout.tsx";
    if (isPageOrRoute && !inProtected && !inLoginSubtree) {
      violations.push(
        `${rel}: a Studio OS page/route outside the (protected) group — it would render without the role guard in app/admin/(protected)/layout.tsx. Move it under (protected).`,
      );
    }
  }
  return violations;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  // Scan app/admin (pages + route actions) *and* domain/ so every "use server"
  // file in the repo is covered — domain/*/actions.ts files are "use server" too
  // and must route every mutation through defineAdminAction(). The page/route
  // check no-ops for domain/ (no page/layout/route files there).
  const roots = [join(process.cwd(), "app", "admin"), join(process.cwd(), "domain")];
  const violations = roots.flatMap((r) => findAdminAuthViolations(r));
  if (violations.length > 0) {
    console.error("Studio OS auth-enforcement check FAILED:\n" + violations.map((v) => "  - " + v).join("\n"));
    process.exit(1);
  }
  console.log("Studio OS auth-enforcement check: all admin pages guarded, all mutations wrapped. OK.");
}
