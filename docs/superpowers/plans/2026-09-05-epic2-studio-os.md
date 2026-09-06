# Epic 2 — Studio OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Studio OS admin application (shell, dashboard, client CRM, agenda, end-to-end shoot creation, financial/payments, expenses, production Kanban, internal prep checklist) on top of Epic 1's finished domain schema, with a mandatory RBAC boundary enforced mechanically from the first task.

**Architecture:** Same Next.js 16 App Router monolith. All Studio OS pages live under `app/admin/(protected)/**`, so the existing `app/admin/(protected)/layout.tsx` role guard (`hasMinimumRole(user.role, "staff")`) runs before any of them render — that is the authoritative boundary for **reads**. Every **write** goes through a single `defineAdminAction()` wrapper (`lib/auth/admin-action.ts`) that calls `requireRole` + Zod-parses input + returns a typed `ActionResult`; a CI guard script (`scripts/check-admin-auth.mjs`) fails the build if any `"use server"` file under `app/admin/**` skips the wrapper, or if any `page`/`route` under `app/admin/**` sits outside `(protected)` (except `login`). Reads use per-domain `queries.ts` modules (Drizzle, Server Components); the Epic 1 pure functions (`calculateBalance`, `deriveShootPaymentStatus`, `canTransition*Status`) are imported, never reimplemented. No new migrations — the schema is frozen after Epic 1.

**Tech Stack:** Next.js 16.3.4 (App Router, RSC, Server Actions) · React 19.2 (`useActionState`) · TypeScript strict · Drizzle ORM + postgres-js · Zod 4 · Tailwind CSS v4 (CSS-first `@theme` tokens) · hand-rolled `components/ui/*` primitives · Vitest · ESLint + Prettier · GitHub Actions CI.

## Global Constraints

- **This is NOT the Next.js you know** (AGENTS.md): before writing Server Actions, dynamic routes, or metadata, read the relevant guide under `node_modules/next/dist/docs/content/01-app/**`. Known deltas already in this repo: `proxy.ts` not `middleware.ts`; `params`/`searchParams` are `Promise`s; `"use server"` files export only async functions.
- **TypeScript strict; no `any`.** (PRD §10.1, §14)
- **Authorization is server-side and mechanical.** Reads: every Studio OS page is under `app/admin/(protected)/`. Writes: every mutation is `defineAdminAction({ role: ... }, handler)`. The CI guard (`npm run check:admin-auth`) enforces both. Hiding UI is not access control. (PRD §3.6; Epic 1 final-review recommendation)
- **RBAC helpers are `lib/auth/rbac.ts`** (`hasMinimumRole`, `requireRole`) reusing `Role`/`CurrentUser` from `lib/auth/session.ts` — never redefine them.
- **No financial rule in the frontend.** `saldo = agreed_price − Σ(confirmed payments)` comes only from `domain/payments/balance.ts`'s `calculateBalance()` / `deriveShootPaymentStatus()`. `shoots.payment_status` is a denormalized cache written **only** by the payment-registration action, never user-editable. (PRD §7.5; `db/schema/shoots.ts` comment)
- **Money is decimal strings end-to-end** (`numeric(10,2)` ↔ `z.string().regex(...)`), never `number`. Format for display only, via `lib/format.ts`.
- **Status enums are fixed** — reuse the Epic 1 `pgEnum`s and `canTransition*Status()` functions verbatim; don't invent states.
- **`recordAuditEvent()` (`domain/audit/service.ts`) is called for every status change and every financial mutation** — `actorUserId` = `ctx.user.id`, with `before`/`after` snapshots. (PRD §12)
- **No new migrations in this epic.** Every task is `Migration: no`. If a schema gap is discovered, stop and raise it — do not add a migration inside a UI task without coordinating (PRD §19.7).
- **IDs are UUIDs.** Pagination on every list (PRD §14): default page size 25.
- **Live-DB integration tests are opt-in**: guard with `process.env.RUN_LIVE_DB_TESTS === "true"`, clean up in `afterAll`. (`docs/DECISIONS.md`, 2026-09-04)
- **Commits include the Task ID**: `SCL-XXX: message`. End commit messages with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Work directly on `main` (as P0 and Epic 1 did); CI must stay green on every push.
- **Portuguese UI copy** (pt-BR), matching the existing login pages and prototype V2.3.

## File Structure

New shared infrastructure (Task 1):

- `lib/cn.ts` — `cn()` classname joiner (no dependency).
- `lib/format.ts` — `formatBRL`, `formatShootDate`, `formatDateTime`, `formatDateInput`. Pure, tested.
- `lib/auth/admin-action.ts` — `defineAdminAction()`, `toFormAction()`, `type ActionResult<T>`. The single write boundary.
- `scripts/check-admin-auth.mjs` — CI guard; exports `findAdminAuthViolations(adminDir)`.
- `components/ui/{field,input,textarea,select,card,badge,data-table,modal,page-header,empty-state}.tsx` — admin primitives on the existing Tailwind v4 tokens.
- `components/admin/{admin-nav,sign-out-button}.tsx` — shell chrome.
- `app/admin/(protected)/sign-out.ts` — sign-out server action (through the wrapper).

Per-domain additions (one `queries.ts` for reads, one `actions.ts` for writes, per domain touched):

- `domain/clients/{queries,actions}.ts`, `domain/clients/form-schema.ts`
- `domain/shoots/{queries,actions}.ts`, `domain/shoots/create-confirmed-shoot.ts`, `domain/shoots/form-schema.ts`
- `domain/payments/{queries,actions}.ts`, `domain/payments/form-schema.ts`
- `domain/production/{queries,actions}.ts`
- `domain/preparation/{queries,actions}.ts`
- `domain/dashboard/queries.ts`, `domain/dashboard/kpis.ts` (pure reducer, tested)

Route tree (all under `app/admin/(protected)/`):

```
/admin                       → dashboard (SCL-201)
/admin/clientes              → client list (SCL-202)
/admin/clientes/novo         → create client (SCL-204)
/admin/clientes/[id]         → client detail (SCL-203)
/admin/agenda                → shoot list (SCL-210)
/admin/agenda/novo           → create confirmed shoot (SCL-211)
/admin/agenda/[id]           → shoot detail (SCL-212, + payments SCL-220, + prep SCL-240)
/admin/financeiro            → financial ledger + KPIs (SCL-221)
/admin/financeiro/despesas   → expenses (SCL-222)
/admin/producao              → production Kanban (SCL-230, + status change SCL-231)
```

This plan covers `docs/TASKS.md`'s Epic 2 backlog in full: SCL-200, SCL-201, SCL-202, SCL-203, SCL-204, SCL-210, SCL-211, SCL-212, SCL-220, SCL-221, SCL-222, SCL-230, SCL-231, SCL-240 (14 tasks).

---

### Task 1: SCL-200 — Admin shell, UI primitives, `defineAdminAction`, CI auth guard

**Files:**
- Create: `lib/cn.ts`
- Create: `lib/format.ts`
- Test: `tests/lib/format.test.ts`
- Create: `lib/auth/admin-action.ts`
- Test: `tests/lib/admin-action.test.ts`
- Create: `scripts/check-admin-auth.mjs`
- Test: `tests/scripts/check-admin-auth.test.ts`
- Create: `components/ui/field.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/data-table.tsx`, `components/ui/modal.tsx`, `components/ui/page-header.tsx`, `components/ui/empty-state.tsx`
- Create: `components/admin/admin-nav.tsx`, `components/admin/sign-out-button.tsx`
- Create: `app/admin/(protected)/sign-out.ts`
- Modify: `app/globals.css` (add `--danger` token)
- Modify: `app/admin/(protected)/layout.tsx` (wrap children in the shell; keep the existing guard + comment)
- Modify: `app/admin/(protected)/page.tsx` (temporary placeholder; SCL-201 replaces it)
- Modify: `package.json` (`check:admin-auth` script)
- Modify: `.github/workflows/ci.yml` (run the guard)

**Interfaces:**
- Consumes: `getCurrentUser`, `type CurrentUser`, `type Role` (`lib/auth/session.ts`); `requireRole`, `hasMinimumRole` (`lib/auth/rbac.ts`); `logger` (`lib/observability/logger.ts`).
- Produces:
  - `cn(...classes: Array<string | false | null | undefined>): string`
  - `formatBRL(value: string): string` → `"R$ 1.234,50"`; `formatShootDate(iso: string): string` → `"18 out 2026"`; `formatDateTime(iso: string): string`; `formatDateInput(iso: string): string` → `"2026-10-18"`
  - `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }`
  - `defineAdminAction<TOut>(config: { role: Role }, handler: (input: undefined, ctx: { user: CurrentUser }) => Promise<TOut>): (raw: unknown) => Promise<ActionResult<TOut>>` and the overload `defineAdminAction<TSchema extends z.ZodType, TOut>(config: { role: Role; input: TSchema }, handler: (input: z.output<TSchema>, ctx: { user: CurrentUser }) => Promise<TOut>): (raw: unknown) => Promise<ActionResult<TOut>>`
  - `toFormAction<T>(action: (raw: unknown) => Promise<ActionResult<T>>, opts?: { numbers?: string[]; booleans?: string[] }): (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>`
  - `findAdminAuthViolations(adminDir: string): string[]`
  - `<Field label htmlFor error? hint?>`, `<Input>`, `<Textarea>`, `<Select>` (native, takes `<option>` children), `<Card className?>`, `<Badge tone?>` (`"neutral" | "active" | "success" | "warning" | "danger"`), `<DataTable columns rows rowKey empty>`, `<Modal open onClose title>`, `<PageHeader title description? action?>`, `<EmptyState title description? action?>`
  - `<AdminNav>`, `<SignOutButton>`

- [ ] **Step 1: `cn` helper**

Create `lib/cn.ts`:

```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 2: Write the failing test for `lib/format.ts`**

Create `tests/lib/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatBRL, formatShootDate, formatDateInput } from "@/lib/format";

describe("formatBRL", () => {
  it("formats a whole-real decimal string", () => {
    expect(formatBRL("1200.00")).toBe("R$ 1.200,00");
  });
  it("formats cents and thousands separators", () => {
    expect(formatBRL("1234.5")).toBe("R$ 1.234,50");
  });
  it("formats zero", () => {
    expect(formatBRL("0.00")).toBe("R$ 0,00");
  });
  it("formats a negative balance (overpayment) without dropping the sign", () => {
    expect(formatBRL("-200.00")).toBe("-R$ 200,00");
  });
});

describe("formatShootDate", () => {
  it("renders a Postgres date string as day-month-year, pt-BR, no timezone shift", () => {
    expect(formatShootDate("2026-10-18")).toBe("18 out 2026");
  });
});

describe("formatDateInput", () => {
  it("passes an ISO date straight through for <input type=date>", () => {
    expect(formatDateInput("2026-10-18")).toBe("2026-10-18");
  });
  it("trims a full ISO datetime down to the date part", () => {
    expect(formatDateInput("2026-10-18T14:30:00.000Z")).toBe("2026-10-18");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/lib/format` has no exports.

- [ ] **Step 4: Implement `lib/format.ts`**

```ts
const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Formats a decimal string (Postgres `numeric`) as Brazilian Real. Works on the
 * string directly — never parseFloat — so 20+ payments never compound a rounding
 * error. Mirrors domain/payments/balance.ts's fixed-point convention.
 */
export function formatBRL(value: string): string {
  const negative = value.startsWith("-");
  const [whole, fraction = "0"] = value.replace("-", "").split(".");
  const cents = `${fraction}00`.slice(0, 2);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}R$ ${grouped},${cents}`;
}

/** Postgres `date` string ("YYYY-MM-DD") → "18 out 2026". Parsed by parts to avoid
 *  the UTC-midnight-shifts-a-day bug `new Date("2026-10-18")` causes in negative
 *  timezones. */
export function formatShootDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS_PT[m - 1]} ${y}`;
}

/** For read-only display of a `timestamp` value. */
export function formatDateTime(iso: string): string {
  const date = formatShootDate(iso);
  const time = iso.slice(11, 16);
  return time ? `${date} · ${time}` : date;
}

/** Normalizes any ISO date/datetime to the "YYYY-MM-DD" an <input type="date"> wants. */
export function formatDateInput(iso: string): string {
  return iso.slice(0, 10);
}
```

- [ ] **Step 5: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 7 tests.

- [ ] **Step 6: Add the `--danger` design token**

In `app/globals.css`, add to the `:root` block (after `--line`):

```css
  --danger: #b3261e;
```

and to the `@theme` block (after `--color-line`):

```css
  --color-danger: var(--danger);
```

- [ ] **Step 7: Write the failing test for `defineAdminAction`**

Create `tests/lib/admin-action.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const getCurrentUser = vi.fn();
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual, getCurrentUser: () => getCurrentUser() };
});

import { defineAdminAction, toFormAction } from "@/lib/auth/admin-action";

beforeEach(() => getCurrentUser.mockReset());

describe("defineAdminAction", () => {
  it("rejects an anonymous caller before running the handler", async () => {
    getCurrentUser.mockResolvedValue(null);
    const handler = vi.fn();
    const action = defineAdminAction({ role: "staff" }, handler);
    const result = await action(undefined);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("permissão") });
    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects a caller whose role is below the minimum", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "c@x.com", role: "client" });
    const handler = vi.fn();
    const action = defineAdminAction({ role: "staff" }, handler);
    const result = await action(undefined);
    expect(result.ok).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns fieldErrors for invalid input without running the handler", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "s@x.com", role: "staff" });
    const handler = vi.fn();
    const action = defineAdminAction(
      { role: "staff", input: z.object({ name: z.string().min(1) }) },
      handler,
    );
    const result = await action({ name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.name).toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the handler with parsed input and the user on success", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "s@x.com", role: "admin" });
    const action = defineAdminAction(
      { role: "staff", input: z.object({ n: z.coerce.number() }) },
      async (input, ctx) => ({ doubled: input.n * 2, by: ctx.user.id }),
    );
    const result = await action({ n: "21" });
    expect(result).toEqual({ ok: true, data: { doubled: 42, by: "u1" } });
  });

  it("catches a handler throw and returns a generic error", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "s@x.com", role: "staff" });
    const action = defineAdminAction({ role: "staff" }, async () => {
      throw new Error("db exploded");
    });
    const result = await action(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toContain("db exploded");
  });
});

describe("toFormAction", () => {
  it("drops empty strings, coerces declared numbers, and treats declared booleans as presence", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "s@x.com", role: "staff" });
    const seen: unknown[] = [];
    const action = defineAdminAction({ role: "staff" }, async (_i, _c) => null);
    // wrap a spy so we can see the raw object toFormAction built
    const spy = async (raw: unknown) => {
      seen.push(raw);
      return action(undefined);
    };
    const formAction = toFormAction(spy, { numbers: ["count"], booleans: ["consent"] });
    const fd = new FormData();
    fd.set("name", "Maria");
    fd.set("phone", "");
    fd.set("count", "3");
    fd.set("consent", "on");
    await formAction(null, fd);
    expect(seen[0]).toEqual({ name: "Maria", count: 3, consent: true });
  });

  it("marks an absent declared boolean as false", async () => {
    const seen: unknown[] = [];
    const formAction = toFormAction(
      async (raw) => {
        seen.push(raw);
        return { ok: true as const, data: null };
      },
      { booleans: ["consent"] },
    );
    await formAction(null, new FormData());
    expect(seen[0]).toEqual({ consent: false });
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/lib/auth/admin-action` has no exports.

- [ ] **Step 9: Implement `lib/auth/admin-action.ts`**

```ts
import { z } from "zod";
import { getCurrentUser, type CurrentUser, type Role } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/rbac";
import { logger } from "@/lib/observability/logger";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type Ctx = { user: CurrentUser };

export function defineAdminAction<TOut>(
  config: { role: Role },
  handler: (input: undefined, ctx: Ctx) => Promise<TOut>,
): (raw: unknown) => Promise<ActionResult<TOut>>;
export function defineAdminAction<TSchema extends z.ZodType, TOut>(
  config: { role: Role; input: TSchema },
  handler: (input: z.output<TSchema>, ctx: Ctx) => Promise<TOut>,
): (raw: unknown) => Promise<ActionResult<TOut>>;
export function defineAdminAction<TSchema extends z.ZodType, TOut>(
  config: { role: Role; input?: TSchema },
  handler: (input: unknown, ctx: Ctx) => Promise<TOut>,
) {
  return async (raw: unknown): Promise<ActionResult<TOut>> => {
    const user = await getCurrentUser();
    try {
      requireRole(user, config.role);
    } catch {
      return { ok: false, error: "Você não tem permissão para executar esta ação." };
    }

    let input: unknown;
    if (config.input) {
      const parsed = config.input.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          error: "Verifique os campos destacados.",
          fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        };
      }
      input = parsed.data;
    }

    try {
      const data = await handler(input, { user: user as CurrentUser });
      return { ok: true, data };
    } catch (err) {
      logger.error("admin action failed", {
        role: config.role,
        message: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, error: "Não foi possível concluir a operação. Tente novamente." };
    }
  };
}

/**
 * Adapts a defineAdminAction result-function to React 19's useActionState signature.
 * Empty form fields are dropped (so Zod `.optional()` sees `undefined`, not `""`);
 * `numbers` are Number()-coerced; `booleans` become presence checks (checkbox on/off).
 */
export function toFormAction<T>(
  action: (raw: unknown) => Promise<ActionResult<T>>,
  opts: { numbers?: string[]; booleans?: string[] } = {},
) {
  return async (_prev: ActionResult<T> | null, formData: FormData): Promise<ActionResult<T>> => {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string") continue;
      if (value === "") continue;
      obj[key] = value;
    }
    for (const key of opts.numbers ?? []) {
      if (key in obj) obj[key] = Number(obj[key]);
    }
    for (const key of opts.booleans ?? []) {
      obj[key] = key in obj;
    }
    return action(obj);
  };
}
```

- [ ] **Step 10: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 7 new tests.

- [ ] **Step 11: Write the failing test for the CI auth guard**

Create `tests/scripts/check-admin-auth.test.ts`:

```ts
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
```

- [ ] **Step 12: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `../../scripts/check-admin-auth.mjs` cannot be resolved.

- [ ] **Step 13: Implement `scripts/check-admin-auth.mjs`**

```js
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
 *     layout.tsx runs the requireRole guard — except app/admin/login.
 * @param {string} adminDir absolute path to an app/admin directory
 * @returns {string[]} human-readable violation messages (empty = clean)
 */
export function findAdminAuthViolations(adminDir) {
  const violations = [];
  for (const abs of walk(adminDir)) {
    const rel = relative(adminDir, abs).replace(/\\/g, "/");
    const src = readFileSync(abs, "utf-8");

    if (/^\s*["']use server["']\s*;?\s*$/m.test(src) && !/\bdefineAdminAction\s*\(/.test(src)) {
      violations.push(
        `${rel}: declares "use server" but never calls defineAdminAction() — every Studio OS mutation must go through the RBAC wrapper (lib/auth/admin-action.ts).`,
      );
    }

    const isPageOrRoute = /(^|\/)(page|layout|route)\.(ts|tsx)$/.test(rel);
    const inProtected = rel.startsWith("(protected)/") || rel === "(protected)/layout.tsx";
    const isLogin = rel.startsWith("login/");
    if (isPageOrRoute && !inProtected && !isLogin) {
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
```

- [ ] **Step 14: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 new tests.

- [ ] **Step 15: Wire the guard into `package.json` and CI**

`package.json` scripts — add after `"lint"`:

```json
    "check:admin-auth": "node scripts/check-admin-auth.mjs",
```

`.github/workflows/ci.yml` — add a step after `- run: npm run lint`:

```yaml
      - run: npm run check:admin-auth
```

Run it locally to confirm the current (empty) tree passes:

```powershell
npm run check:admin-auth
```

Expected: `... all admin pages guarded, all mutations wrapped. OK.`

- [ ] **Step 16: Build the UI primitives**

Create `components/ui/field.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="font-sans text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="font-sans text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

Create `components/ui/input.tsx`:

```tsx
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full border border-line bg-white px-3.5 py-2.5 font-sans text-sm text-ink",
        "outline-none focus:border-ink disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
```

Create `components/ui/textarea.tsx`:

```tsx
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full border border-line bg-white px-3.5 py-2.5 font-sans text-sm text-ink",
        "outline-none focus:border-ink disabled:opacity-50",
        className,
      )}
      rows={4}
      {...props}
    />
  );
}
```

Create `components/ui/select.tsx`:

```tsx
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full border border-line bg-white px-3.5 py-2.5 font-sans text-sm text-ink",
        "outline-none focus:border-ink disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
```

Create `components/ui/card.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("border border-line bg-white p-6", className)}>{children}</div>;
}
```

Create `components/ui/badge.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = {
  neutral: "border-line text-muted",
  active: "border-ink text-ink",
  success: "border-[#1e7d4f] text-[#1e7d4f]",
  warning: "border-taupe2 text-taupe2",
  danger: "border-danger text-danger",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.12em]",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
```

Create `components/ui/data-table.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Column<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  className?: string;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  empty: ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full border-collapse font-sans text-sm">
        <thead>
          <tr className="border-b border-line bg-champ">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-3 text-left text-[11px] font-normal uppercase tracking-[0.12em] text-muted",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3 text-ink", c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Create `components/ui/modal.tsx`:

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-full max-w-lg border border-line bg-white p-0 text-ink backdrop:bg-ink/30"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-serif text-xl font-light">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="text-muted hover:text-ink">
          ✕
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
```

Create `components/ui/page-header.tsx`:

```tsx
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">{title}</h1>
        {description ? <p className="mt-1 font-sans text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
```

Create `components/ui/empty-state.tsx`:

```tsx
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-line bg-white px-6 py-16 text-center">
      <p className="font-serif text-lg font-light text-ink">{title}</p>
      {description ? <p className="mt-1 font-sans text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
```

- [ ] **Step 17: Build the shell chrome**

Create `components/admin/admin-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/financeiro", label: "Financeiro" },
  { href: "/admin/producao", label: "Produção" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-2 font-sans text-[11px] uppercase tracking-[0.16em] transition-colors",
              active ? "bg-ink text-white" : "text-muted hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

Create `app/admin/(protected)/sign-out.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defineAdminAction } from "@/lib/auth/admin-action";

// role: "client" — any authenticated user may end their own session. Still routed
// through defineAdminAction so the CI guard sees a compliant "use server" file and
// the sign-out path gets the same getCurrentUser plumbing as every other action.
const signOut = defineAdminAction({ role: "client" }, async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return null;
});

export async function signOutAction() {
  await signOut(undefined);
  redirect("/admin/login");
}
```

Create `components/admin/sign-out-button.tsx`:

```tsx
import { signOutAction } from "@/app/admin/(protected)/sign-out";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="font-sans text-[11px] uppercase tracking-[0.16em] text-muted hover:text-ink"
      >
        Sair
      </button>
    </form>
  );
}
```

- [ ] **Step 18: Wrap the protected layout in the shell**

Replace `app/admin/(protected)/layout.tsx` with (keeping the existing guard **and its comment** intact):

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Distinct from the anonymous case on purpose: every profile is created as "client" (see
  // 0002_handle_new_user_trigger.sql), so a staff member who has not been promoted yet would
  // otherwise log in successfully and bounce straight back to a blank form — an endless loop
  // that reads as a broken login rather than a permissions problem.
  if (!hasMinimumRole(user.role, "staff")) {
    redirect(
      `/admin/login?error=${encodeURIComponent("Sua conta não tem permissão de acesso ao Studio OS.")}`,
    );
  }

  return (
    <div className="flex min-h-screen bg-cream text-ink">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-line bg-white p-6">
        <div>
          <p className="font-serif text-lg font-light">Studio OS</p>
          <p className="mb-8 font-sans text-[10px] uppercase tracking-[0.16em] text-muted">
            Stúdio Carol Lucas
          </p>
          <AdminNav />
        </div>
        <div className="flex flex-col gap-2">
          <p className="truncate font-sans text-xs text-muted">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-10">{children}</main>
    </div>
  );
}
```

Replace `app/admin/(protected)/page.tsx` with a temporary placeholder (SCL-201 replaces it):

```tsx
export default function AdminHome() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-light">Studio OS</h1>
      <p className="mt-2 font-sans text-sm text-muted">Dashboard chega em SCL-201.</p>
    </div>
  );
}
```

- [ ] **Step 19: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green.

- [ ] **Step 20: Commit**

```powershell
git add lib/cn.ts lib/format.ts lib/auth/admin-action.ts scripts/check-admin-auth.mjs components/ui/ components/admin/ app/admin/ app/globals.css package.json .github/workflows/ci.yml tests/lib/format.test.ts tests/lib/admin-action.test.ts tests/scripts/check-admin-auth.test.ts
git commit -m "$(cat <<'EOF'
SCL-200: admin shell, UI primitives, defineAdminAction wrapper, CI auth guard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 21: Update `docs/TASKS.md`**

Move SCL-200 to `DONE` in the summary table. Add a detailed section (same format as Epic 1's SCL-107) recording: the `defineAdminAction` + CI-guard enforcement model (reads guarded by the `(protected)` layout, writes by the wrapper, `check-admin-auth.mjs` enforcing both); the hand-rolled-primitives decision. Then add a new `docs/DECISIONS.md` entry, `2026-09-05 — Studio OS authorization boundary` and `2026-09-05 — Admin UI: hand-rolled primitives on Tailwind v4 tokens (not shadcn/ui)`, and update SCL-200's `Depends on` to `SCL-007,SCL-009,SCL-100`. Commit: `SCL-200: mark task DONE in docs/TASKS.md`.

---

### Task 2: SCL-201 — Dashboard

**Files:**
- Create: `domain/dashboard/kpis.ts`
- Test: `tests/domain/dashboard-kpis.test.ts`
- Create: `domain/dashboard/queries.ts`
- Create: `app/admin/(protected)/page.tsx` (replace the Task 1 placeholder)
- Create: `components/admin/kpi-tile.tsx`

**Interfaces:**
- Consumes: `db` (`db/client.ts`); `shoots`, `payments`, `expenses`, `productionJobs` (`db/schema`); `calculateBalance` (`domain/payments/balance.ts`); `formatBRL`, `formatShootDate` (`lib/format.ts`); `Card`, `PageHeader`, `Badge` (`components/ui/*`). Read path is guarded by `app/admin/(protected)/layout.tsx` — no `defineAdminAction` here (no mutations).
- Produces:
  - `type DashboardInput = { shoots: { agreedPrice: string; status: string; shootDate: string }[]; payments: { amount: string; status: "pendente" | "confirmado" | "estornado"; shootId: string }[]; shootIdByAgreedPrice?: never }` — see the exact shape in Step 1
  - `computeDashboardKpis(input: DashboardInput): DashboardKpis`
  - `type DashboardKpis = { shootsInPeriod: number; billed: string; received: string; receivable: string; expenses: string; result: string; averageTicket: string; productionInProgress: number; finishedShoots: number; upcomingDeliveries: number }`
  - `getDashboardData(range: { from: string; to: string }): Promise<{ kpis: DashboardKpis; attention: AttentionItem[] }>` where `type AttentionItem = { kind: "unpaid" | "delivery_overdue"; shootId: string; label: string }`

- [ ] **Step 1: Write the failing test for `computeDashboardKpis`**

Create `tests/domain/dashboard-kpis.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeDashboardKpis, type DashboardInput } from "@/domain/dashboard/kpis";

const base: DashboardInput = {
  shoots: [
    { id: "s1", agreedPrice: "1000.00", status: "reserva", shootDate: "2026-09-10" },
    { id: "s2", agreedPrice: "2000.00", status: "edicao", shootDate: "2026-09-20" },
    { id: "s3", agreedPrice: "1500.00", status: "entregue", shootDate: "2026-09-25" },
  ],
  payments: [
    { shootId: "s1", amount: "500.00", status: "confirmado" },
    { shootId: "s2", amount: "2000.00", status: "confirmado" },
    { shootId: "s2", amount: "300.00", status: "pendente" },
    { shootId: "s3", amount: "1500.00", status: "estornado" },
  ],
  expenses: [{ amount: "400.00" }, { amount: "100.50" }],
};

describe("computeDashboardKpis", () => {
  it("counts shoots in the period", () => {
    expect(computeDashboardKpis(base).shootsInPeriod).toBe(3);
  });

  it("bills the sum of every shoot's agreed price", () => {
    expect(computeDashboardKpis(base).billed).toBe("4500.00");
  });

  it("receives only confirmed payments", () => {
    expect(computeDashboardKpis(base).received).toBe("2500.00");
  });

  it("computes receivable as billed minus received, not clamped below zero per-shoot but summed", () => {
    // s1: 1000-500=500 ; s2: 2000-2000=0 ; s3: 1500-0=1500  => 2000.00
    expect(computeDashboardKpis(base).receivable).toBe("2000.00");
  });

  it("sums expenses and derives operating result (received minus expenses)", () => {
    expect(computeDashboardKpis(base).expenses).toBe("500.50");
    expect(computeDashboardKpis(base).result).toBe("1999.50");
  });

  it("average ticket is billed over shoot count", () => {
    expect(computeDashboardKpis(base).averageTicket).toBe("1500.00");
  });

  it("average ticket is 0.00 with no shoots", () => {
    expect(computeDashboardKpis({ shoots: [], payments: [], expenses: [] }).averageTicket).toBe("0.00");
  });

  it("counts production-in-progress (edicao/realizado) and finished (finalizado/reveal/entregue)", () => {
    const k = computeDashboardKpis(base);
    expect(k.productionInProgress).toBe(1);
    expect(k.finishedShoots).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/dashboard/kpis` has no exports.

- [ ] **Step 3: Implement `domain/dashboard/kpis.ts`**

```ts
type ShootRow = { id: string; agreedPrice: string; status: string; shootDate: string };
type PaymentRow = { shootId: string; amount: string; status: "pendente" | "confirmado" | "estornado" };
type ExpenseRow = { amount: string };

export type DashboardInput = {
  shoots: ShootRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
};

export type DashboardKpis = {
  shootsInPeriod: number;
  billed: string;
  received: string;
  receivable: string;
  expenses: string;
  result: string;
  averageTicket: string;
  productionInProgress: number;
  finishedShoots: number;
  upcomingDeliveries: number;
};

// Fixed-point in cents, same convention as domain/payments/balance.ts.
function toCents(value: string): number {
  const negative = value.startsWith("-");
  const [whole, fraction = "0"] = value.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2));
  return negative ? -cents : cents;
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const IN_PROGRESS = new Set(["realizado", "edicao"]);
const FINISHED = new Set(["finalizado", "reveal", "entregue"]);

export function computeDashboardKpis(input: DashboardInput): DashboardKpis {
  const billedCents = input.shoots.reduce((sum, s) => sum + toCents(s.agreedPrice), 0);

  const confirmedByShoot = new Map<string, number>();
  for (const p of input.payments) {
    if (p.status !== "confirmado") continue;
    confirmedByShoot.set(p.shootId, (confirmedByShoot.get(p.shootId) ?? 0) + toCents(p.amount));
  }
  const receivedCents = [...confirmedByShoot.values()].reduce((a, b) => a + b, 0);

  const receivableCents = input.shoots.reduce((sum, s) => {
    const paid = confirmedByShoot.get(s.id) ?? 0;
    const remaining = toCents(s.agreedPrice) - paid;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const expensesCents = input.expenses.reduce((sum, e) => sum + toCents(e.amount), 0);
  const count = input.shoots.length;

  return {
    shootsInPeriod: count,
    billed: fromCents(billedCents),
    received: fromCents(receivedCents),
    receivable: fromCents(receivableCents),
    expenses: fromCents(expensesCents),
    result: fromCents(receivedCents - expensesCents),
    averageTicket: fromCents(count === 0 ? 0 : Math.round(billedCents / count)),
    productionInProgress: input.shoots.filter((s) => IN_PROGRESS.has(s.status)).length,
    finishedShoots: input.shoots.filter((s) => FINISHED.has(s.status)).length,
    upcomingDeliveries: 0, // filled by getDashboardData from production_jobs, not derivable here
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 9 tests.

- [ ] **Step 5: Implement `domain/dashboard/queries.ts`**

```ts
import { and, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { shoots, payments, expenses, productionJobs } from "@/db/schema";
import { computeDashboardKpis, type DashboardKpis } from "./kpis";

export type AttentionItem = {
  kind: "unpaid" | "delivery_overdue";
  shootId: string;
  label: string;
};

export async function getDashboardData(range: { from: string; to: string }): Promise<{
  kpis: DashboardKpis;
  attention: AttentionItem[];
}> {
  const periodShoots = await db
    .select({
      id: shoots.id,
      agreedPrice: shoots.agreedPrice,
      status: shoots.status,
      shootDate: shoots.shootDate,
      paymentStatus: shoots.paymentStatus,
    })
    .from(shoots)
    .where(and(gte(shoots.shootDate, range.from), lte(shoots.shootDate, range.to)));

  const shootIds = periodShoots.map((s) => s.id);
  const periodPayments = shootIds.length
    ? await db
        .select({ shootId: payments.shootId, amount: payments.amount, status: payments.status })
        .from(payments)
        .where(inArray(payments.shootId, shootIds))
    : [];

  const periodExpenses = await db
    .select({ amount: expenses.amount })
    .from(expenses)
    .where(and(gte(expenses.date, range.from), lte(expenses.date, range.to)));

  const kpis = computeDashboardKpis({
    shoots: periodShoots.map((s) => ({
      id: s.id,
      agreedPrice: s.agreedPrice,
      status: s.status,
      shootDate: s.shootDate,
    })),
    payments: periodPayments,
    expenses: periodExpenses,
  });

  const today = new Date().toISOString().slice(0, 10);
  const overdueJobs = await db
    .select({ shootId: productionJobs.shootId, dueAt: productionJobs.deliveryDueAt })
    .from(productionJobs)
    .where(
      and(
        lte(productionJobs.deliveryDueAt, today),
        inArray(productionJobs.status, ["aguardando", "iniciado", "parcial", "finalizado"]),
      ),
    );

  kpis.upcomingDeliveries = overdueJobs.length;

  const attention: AttentionItem[] = [
    ...periodShoots
      .filter((s) => s.paymentStatus === "nao_iniciado" || s.paymentStatus === "parcial")
      .map((s): AttentionItem => ({ kind: "unpaid", shootId: s.id, label: "Pagamento pendente" })),
    ...overdueJobs.map((j): AttentionItem => ({
      kind: "delivery_overdue",
      shootId: j.shootId,
      label: "Entrega vencida",
    })),
  ];

  return { kpis, attention };
}
```

- [ ] **Step 6: KPI tile component**

Create `components/admin/kpi-tile.tsx`:

```tsx
import { Card } from "@/components/ui/card";

export function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-2xl font-light text-ink">{value}</p>
      {sub ? <p className="mt-1 font-sans text-xs text-muted">{sub}</p> : null}
    </Card>
  );
}
```

- [ ] **Step 7: Dashboard page**

Create `app/admin/(protected)/page.tsx` (replacing the Task 1 placeholder):

```tsx
import Link from "next/link";
import { getDashboardData } from "@/domain/dashboard/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { KpiTile } from "@/components/admin/kpi-tile";
import { formatBRL } from "@/lib/format";

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

export default async function DashboardPage() {
  const range = currentMonthRange();
  const { kpis, attention } = await getDashboardData(range);

  return (
    <div>
      <PageHeader title="Dashboard" description={`Período: ${range.from} a ${range.to}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Ensaios no período" value={String(kpis.shootsInPeriod)} />
        <KpiTile label="Faturado" value={formatBRL(kpis.billed)} />
        <KpiTile label="Recebido" value={formatBRL(kpis.received)} />
        <KpiTile label="A receber" value={formatBRL(kpis.receivable)} />
        <KpiTile label="Despesas" value={formatBRL(kpis.expenses)} />
        <KpiTile label="Resultado" value={formatBRL(kpis.result)} />
        <KpiTile label="Ticket médio" value={formatBRL(kpis.averageTicket)} />
        <KpiTile
          label="Produção"
          value={String(kpis.productionInProgress)}
          sub={`${kpis.finishedShoots} finalizados · ${kpis.upcomingDeliveries} entregas vencidas`}
        />
      </div>

      <Card className="mt-8">
        <h2 className="font-serif text-lg font-light text-ink">Ações que exigem atenção</h2>
        {attention.length === 0 ? (
          <p className="mt-2 font-sans text-sm text-muted">Nada pendente no período.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {attention.map((item, i) => (
              <li key={`${item.kind}-${item.shootId}-${i}`} className="font-sans text-sm">
                <Link href={`/admin/agenda/${item.shootId}`} className="text-ink underline-offset-2 hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 8: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green. (`build` compiles the page; with an empty DB it renders zeros — that is correct behaviour, PRD §7.1 "calculado a partir dos dados normalizados".)

- [ ] **Step 9: Commit**

```powershell
git add domain/dashboard/ app/admin/ components/admin/kpi-tile.tsx tests/domain/dashboard-kpis.test.ts
git commit -m "$(cat <<'EOF'
SCL-201: Studio OS dashboard with derived KPIs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10: Update `docs/TASKS.md`**

Summary-table row + detailed section for SCL-201, `DONE`, noting: all KPIs derived (no stored indicators — PRD §7.1); `computeDashboardKpis` is a pure, tested reducer; `upcomingDeliveries`/`attention` come from `production_jobs`. Commit: `SCL-201: mark task DONE in docs/TASKS.md`.

---

### Task 3: SCL-202 — Client list

**Files:**
- Create: `domain/clients/queries.ts`
- Test: `tests/domain/clients-queries.test.ts`
- Create: `app/admin/(protected)/clientes/page.tsx`
- Create: `components/admin/search-input.tsx`
- Create: `components/admin/pagination.tsx`

**Interfaces:**
- Consumes: `db`; `clients` (`db/schema`); `DataTable`, `PageHeader`, `EmptyState` (`components/ui/*`); `formatShootDate` (`lib/format.ts`). Guarded by the `(protected)` layout.
- Produces:
  - `type ClientListRow = { id: string; name: string; phone: string | null; instagramHandle: string | null; createdAt: string }`
  - `type ClientListResult = { rows: ClientListRow[]; total: number; page: number; pageSize: number }`
  - `listClients(params: { search?: string; page?: number; pageSize?: number }): Promise<ClientListResult>`
  - `buildClientSearchPredicate(search: string | undefined)` — exported pure helper returning a Drizzle `SQL | undefined` (tested indirectly; the testable unit is `normalizeListParams`)
  - `normalizeListParams(raw: { search?: string; page?: string | number; pageSize?: string | number }): { search?: string; page: number; pageSize: number }`

- [ ] **Step 1: Write the failing test for `normalizeListParams`**

Create `tests/domain/clients-queries.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeListParams } from "@/domain/clients/queries";

describe("normalizeListParams", () => {
  it("defaults page to 1 and pageSize to 25", () => {
    expect(normalizeListParams({})).toEqual({ search: undefined, page: 1, pageSize: 25 });
  });

  it("parses string page/pageSize from query params", () => {
    expect(normalizeListParams({ page: "3", pageSize: "50" })).toEqual({
      search: undefined,
      page: 3,
      pageSize: 50,
    });
  });

  it("clamps page to >= 1 and pageSize to 1..100", () => {
    expect(normalizeListParams({ page: "0", pageSize: "999" }).page).toBe(1);
    expect(normalizeListParams({ page: "-2", pageSize: "999" }).pageSize).toBe(100);
    expect(normalizeListParams({ pageSize: "0" }).pageSize).toBe(25);
  });

  it("trims search and treats empty/whitespace as undefined", () => {
    expect(normalizeListParams({ search: "  maria  " }).search).toBe("maria");
    expect(normalizeListParams({ search: "   " }).search).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/clients/queries` has no exports.

- [ ] **Step 3: Implement `domain/clients/queries.ts`**

```ts
import { and, or, ilike, sql, desc, count, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";

export type ClientListRow = {
  id: string;
  name: string;
  phone: string | null;
  instagramHandle: string | null;
  createdAt: string;
};

export type ClientListResult = {
  rows: ClientListRow[];
  total: number;
  page: number;
  pageSize: number;
};

export function normalizeListParams(raw: {
  search?: string;
  page?: string | number;
  pageSize?: string | number;
}): { search?: string; page: number; pageSize: number } {
  const trimmed = typeof raw.search === "string" ? raw.search.trim() : "";
  const pageNum = Math.max(1, Math.floor(Number(raw.page ?? 1)) || 1);
  const sizeRaw = Math.floor(Number(raw.pageSize ?? 25)) || 25;
  const pageSize = Math.min(100, Math.max(1, sizeRaw));
  return { search: trimmed === "" ? undefined : trimmed, page: pageNum, pageSize };
}

export function buildClientSearchPredicate(search: string | undefined): SQL | undefined {
  if (!search) return undefined;
  const like = `%${search}%`;
  return or(
    ilike(clients.name, like),
    ilike(clients.phone, like),
    ilike(clients.email, like),
    ilike(clients.instagramHandle, like),
  );
}

export async function listClients(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ClientListResult> {
  const { search, page, pageSize } = normalizeListParams(params);
  const where = buildClientSearchPredicate(search);

  const [{ total }] = await db
    .select({ total: count() })
    .from(clients)
    .where(where ?? sql`true`);

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      instagramHandle: clients.instagramHandle,
      createdAt: sql<string>`${clients.createdAt}::text`,
    })
    .from(clients)
    .where(where ?? sql`true`)
    .orderBy(desc(clients.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total: Number(total), page, pageSize };
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Shared list components**

Create `components/admin/search-input.tsx`:

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function SearchInput({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("search") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (value.trim()) next.set("search", value.trim());
    else next.delete("search");
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <form onSubmit={submit} className="w-64">
      <Input
        type="search"
        name="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
    </form>
  );
}
```

Create `components/admin/pagination.tsx`:

```tsx
import Link from "next/link";

export function Pagination({
  basePath,
  searchParams,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage === 1) return null;

  function href(targetPage: number): string {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v) next.set(k, v);
    next.set("page", String(targetPage));
    return `${basePath}?${next.toString()}`;
  }

  return (
    <div className="mt-4 flex items-center justify-between font-sans text-xs text-muted">
      <span>
        Página {page} de {lastPage} · {total} registros
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="border border-line px-3 py-1 hover:border-ink">
            Anterior
          </Link>
        ) : null}
        {page < lastPage ? (
          <Link href={href(page + 1)} className="border border-line px-3 py-1 hover:border-ink">
            Próxima
          </Link>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Client list page**

Create `app/admin/(protected)/clientes/page.tsx`:

```tsx
import Link from "next/link";
import { listClients } from "@/domain/clients/queries";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/admin/search-input";
import { Pagination } from "@/components/admin/pagination";
import { formatShootDate } from "@/lib/format";
import type { ClientListRow } from "@/domain/clients/queries";

type SearchParams = Promise<{ search?: string; page?: string }>;

const columns: Column<ClientListRow>[] = [
  {
    key: "name",
    header: "Nome",
    render: (row) => (
      <Link href={`/admin/clientes/${row.id}`} className="text-ink underline-offset-2 hover:underline">
        {row.name}
      </Link>
    ),
  },
  { key: "phone", header: "Telefone", render: (row) => row.phone ?? "—" },
  { key: "instagram", header: "Instagram", render: (row) => row.instagramHandle ?? "—" },
  { key: "createdAt", header: "Cadastro", render: (row) => formatShootDate(row.createdAt) },
];

export default async function ClientListPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const result = await listClients({ search: sp.search, page: sp.page ? Number(sp.page) : 1 });

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="CRM — cada cliente pode ter vários ensaios ao longo do tempo."
        action={
          <Link
            href="/admin/clientes/novo"
            className="border border-ink bg-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink"
          >
            Nova cliente
          </Link>
        }
      />

      <div className="mb-4">
        <SearchInput placeholder="Buscar por nome, telefone, e-mail…" />
      </div>

      <DataTable
        columns={columns}
        rows={result.rows}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            title="Nenhuma cliente encontrada"
            description={sp.search ? "Ajuste a busca ou cadastre uma nova cliente." : "Cadastre a primeira cliente."}
            action={
              <Link href="/admin/clientes/novo" className="border border-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink">
                Nova cliente
              </Link>
            }
          />
        }
      />

      <Pagination
        basePath="/admin/clientes"
        searchParams={{ search: sp.search }}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </div>
  );
}
```

- [ ] **Step 7: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green.

- [ ] **Step 8: Commit**

```powershell
git add domain/clients/queries.ts app/admin/(protected)/clientes/ components/admin/search-input.tsx components/admin/pagination.tsx tests/domain/clients-queries.test.ts
git commit -m "$(cat <<'EOF'
SCL-202: client list with search and pagination

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-202, `DONE`. Note the paginated query (PRD §14), `normalizeListParams` as the tested unit, and that `SearchInput`/`Pagination` are reused by SCL-210/SCL-221. Commit: `SCL-202: mark task DONE in docs/TASKS.md`.

---

### Task 4: SCL-204 — Create client

**Files:**
- Create: `domain/clients/form-schema.ts`
- Test: `tests/domain/clients-form-schema.test.ts`
- Create: `domain/clients/actions.ts`
- Create: `app/admin/(protected)/clientes/novo/page.tsx`
- Create: `components/admin/client-form.tsx`
- Create: `components/admin/form-status.tsx`
- Create: `components/admin/submit-button.tsx`

**Interfaces:**
- Consumes: `defineAdminAction`, `toFormAction`, `type ActionResult` (`lib/auth/admin-action.ts`); `createClientSchema`, `type CreateClientInput` (`domain/clients/schema.ts`); `createClient` (`domain/clients/service.ts`); `recordAuditEvent` (`domain/audit/service.ts`); `revalidatePath`, `redirect`; `Field`, `Input`, `Textarea`, `Card` (`components/ui/*`).
- Produces:
  - `clientFormSchema` — `createClientSchema` extended so an `<input type="checkbox">` (`"on"`/absent) and empty strings map cleanly. Exact shape in Step 1.
  - `createClientAction: (raw: unknown) => Promise<ActionResult<{ id: string }>>` (`"use server"`, wrapped)
  - `<ClientForm action initialState? submitLabel? />` — client component; reused by SCL-203 for edit
  - `<FormStatus state />` — renders `state.error` when `!state.ok`
  - `<SubmitButton>{label}</SubmitButton>` — `useFormStatus` pending state

- [ ] **Step 1: Write the failing test for `clientFormSchema`**

Create `tests/domain/clients-form-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { clientFormSchema } from "@/domain/clients/form-schema";

describe("clientFormSchema", () => {
  it("accepts a name-only submission", () => {
    const r = clientFormSchema.safeParse({ name: "Maria Silva" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.marketingConsent).toBe(false);
  });

  it("coerces a checkbox boolean already normalized by toFormAction", () => {
    const r = clientFormSchema.safeParse({ name: "Maria", marketingConsent: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.marketingConsent).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(clientFormSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(clientFormSchema.safeParse({ name: "Maria", email: "nope" }).success).toBe(false);
  });

  it("rejects a malformed birthday", () => {
    expect(clientFormSchema.safeParse({ name: "Maria", birthday: "12/03/1994" }).success).toBe(false);
  });

  it("rejects a referrerClientId that is not a uuid", () => {
    expect(clientFormSchema.safeParse({ name: "Maria", referrerClientId: "x" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/clients/form-schema` has no exports.

- [ ] **Step 3: Implement `domain/clients/form-schema.ts`**

```ts
import { z } from "zod";
import { createClientSchema } from "./schema";

// createClientSchema already covers every field. The only form-specific concern is
// the marketing-consent checkbox: toFormAction() (lib/auth/admin-action.ts) turns a
// declared boolean field into a real `true`/`false` before the action runs, so here
// we only need to accept an already-boolean value and keep the same `.default(false)`.
export const clientFormSchema = createClientSchema;

export type ClientFormValues = z.input<typeof clientFormSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 6 tests (they exercise `createClientSchema` through the re-export).

- [ ] **Step 5: Implement `domain/clients/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { createClient, getClientById } from "@/domain/clients/service";
import { updateClient } from "@/domain/clients/service";
import { recordAuditEvent } from "@/domain/audit/service";
import { clientFormSchema } from "./form-schema";

export const createClientAction = defineAdminAction(
  { role: "staff", input: clientFormSchema },
  async (input, ctx) => {
    const created = await createClient(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "client.created",
      entityType: "client",
      entityId: created.id,
      before: null,
      after: created,
    });
    revalidatePath("/admin/clientes");
    return { id: created.id };
  },
);

export const updateClientAction = defineAdminAction(
  { role: "staff", input: clientFormSchema.extend({ id: clientFormSchema.shape.name.constructor === Object ? undefined : undefined }) as never },
  async () => {
    throw new Error("replaced in Step 6");
  },
);
```

> The `updateClientAction` stub above is intentionally wrong — Step 6 rewrites this file with the real version once `updateClient` exists. It is written this way only so the file has a single home; do not commit the stub. If you prefer, skip the stub and add `updateClientAction` in Step 6 as the sole edit.

- [ ] **Step 6: Add `updateClient` to the service and finalize `actions.ts`**

Append to `domain/clients/service.ts`:

```ts
import { updateClientSchema, type UpdateClientInput } from "./schema";

export async function updateClient(id: string, input: UpdateClientInput): Promise<Client> {
  const parsed = updateClientSchema.parse(input);
  const [row] = await db.update(clients).set(parsed).where(eq(clients.id, id)).returning();
  return row;
}
```

Append to `domain/clients/schema.ts`:

```ts
// Every field optional for a partial update; name still non-empty when present.
export const updateClientSchema = createClientSchema.partial().extend({
  name: z.string().min(1).optional(),
});

export type UpdateClientInput = z.input<typeof updateClientSchema>;
```

(`z` is already imported in `domain/clients/schema.ts`.)

Rewrite `domain/clients/actions.ts` in full:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { createClient, getClientById, updateClient } from "@/domain/clients/service";
import { recordAuditEvent } from "@/domain/audit/service";
import { clientFormSchema } from "./form-schema";
import { updateClientSchema } from "./schema";

export const createClientAction = defineAdminAction(
  { role: "staff", input: clientFormSchema },
  async (input, ctx) => {
    const created = await createClient(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "client.created",
      entityType: "client",
      entityId: created.id,
      before: null,
      after: created,
    });
    revalidatePath("/admin/clientes");
    return { id: created.id };
  },
);

export const updateClientAction = defineAdminAction(
  { role: "staff", input: updateClientSchema.extend({ id: z.string().uuid() }) },
  async (input, ctx) => {
    const { id, ...patch } = input;
    const before = await getClientById(id);
    if (!before) throw new Error("cliente inexistente");
    const updated = await updateClient(id, patch);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "client.updated",
      entityType: "client",
      entityId: id,
      before,
      after: updated,
    });
    revalidatePath(`/admin/clientes/${id}`);
    revalidatePath("/admin/clientes");
    return { id };
  },
);
```

- [ ] **Step 7: Shared form-feedback components**

Create `components/admin/form-status.tsx`:

```tsx
import type { ActionResult } from "@/lib/auth/admin-action";

export function FormStatus({ state }: { state: ActionResult<unknown> | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="border border-danger px-4 py-3 font-sans text-sm text-danger">
      {state.error}
    </p>
  );
}
```

Create `components/admin/submit-button.tsx`:

```tsx
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-ink bg-ink px-7 py-4 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink disabled:opacity-50"
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}
```

- [ ] **Step 8: Client form component**

Create `components/admin/client-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { toFormAction, type ActionResult } from "@/lib/auth/admin-action";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

type Values = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  instagramHandle?: string | null;
  birthday?: string | null;
  source?: string | null;
  styleProfile?: string | null;
  notes?: string | null;
  marketingConsent?: boolean;
};

export function ClientForm({
  action,
  initialValues,
  submitLabel = "Salvar",
  hiddenId,
}: {
  action: (raw: unknown) => Promise<ActionResult<{ id: string }>>;
  initialValues?: Values;
  submitLabel?: string;
  hiddenId?: string;
}) {
  const [state, formAction] = useActionState(
    toFormAction(action, { booleans: ["marketingConsent"] }),
    null,
  );
  const fieldError = (name: string) =>
    state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      <FormStatus state={state} />
      {hiddenId ? <input type="hidden" name="id" value={hiddenId} /> : null}

      <Field label="Nome" htmlFor="name" error={fieldError("name")}>
        <Input id="name" name="name" required defaultValue={initialValues?.name ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Telefone" htmlFor="phone" error={fieldError("phone")}>
          <Input id="phone" name="phone" defaultValue={initialValues?.phone ?? ""} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={fieldError("email")}>
          <Input id="email" name="email" type="email" defaultValue={initialValues?.email ?? ""} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Instagram" htmlFor="instagramHandle" error={fieldError("instagramHandle")}>
          <Input id="instagramHandle" name="instagramHandle" defaultValue={initialValues?.instagramHandle ?? ""} />
        </Field>
        <Field label="Aniversário" htmlFor="birthday" hint="AAAA-MM-DD" error={fieldError("birthday")}>
          <Input id="birthday" name="birthday" type="date" defaultValue={initialValues?.birthday ?? ""} />
        </Field>
      </div>
      <Field label="Origem" htmlFor="source" error={fieldError("source")}>
        <Input id="source" name="source" defaultValue={initialValues?.source ?? ""} />
      </Field>
      <Field label="Perfil de estilo" htmlFor="styleProfile" error={fieldError("styleProfile")}>
        <Input id="styleProfile" name="styleProfile" defaultValue={initialValues?.styleProfile ?? ""} />
      </Field>
      <Field label="Observações" htmlFor="notes" error={fieldError("notes")}>
        <Textarea id="notes" name="notes" defaultValue={initialValues?.notes ?? ""} />
      </Field>
      <label className="flex items-center gap-2 font-sans text-sm text-ink">
        <input
          type="checkbox"
          name="marketingConsent"
          defaultChecked={initialValues?.marketingConsent ?? false}
        />
        Consentimento de marketing
      </label>

      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
```

- [ ] **Step 9: Create-client page**

Create `app/admin/(protected)/clientes/novo/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { createClientAction } from "@/domain/clients/actions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ClientForm } from "@/components/admin/client-form";
import type { ActionResult } from "@/lib/auth/admin-action";

export default function NewClientPage() {
  const router = useRouter();

  async function action(raw: unknown): Promise<ActionResult<{ id: string }>> {
    const result = await createClientAction(raw);
    if (result.ok) router.push(`/admin/clientes/${result.data.id}`);
    return result;
  }

  return (
    <div>
      <PageHeader title="Nova cliente" description="Cadastro CRM — pode ser criado antes do primeiro ensaio." />
      <Card>
        <ClientForm action={action} submitLabel="Cadastrar" />
      </Card>
    </div>
  );
}
```

- [ ] **Step 10: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green. `check:admin-auth` must confirm `domain/clients/actions.ts` is compliant — note that file lives in `domain/`, not `app/admin/`, so the guard as written (scans `app/admin/`) does **not** cover it. That is acceptable: the guard's job is to catch a route/action file that *renders or is invoked as a route* without protection. `domain/*/actions.ts` files are only ever imported by `(protected)` pages and each one visibly uses `defineAdminAction`. If you want defense-in-depth, extend `findAdminAuthViolations` to also scan `domain/**/actions.ts` for `"use server"` + `defineAdminAction` — do that as a one-line change to the `walk` roots in Step 13 of Task 1 and note it in the commit. **Recommended: make that extension now** so every `"use server"` file in the repo is covered.

If extending: in `scripts/check-admin-auth.mjs`, change the direct-invocation block to also walk `domain/`:

```js
if (invokedDirectly) {
  const roots = [join(process.cwd(), "app", "admin"), join(process.cwd(), "domain")];
  const violations = roots.flatMap((r) => findAdminAuthViolations(r));
  // ...unchanged reporting
}
```

and in `findAdminAuthViolations`, the page/route check already no-ops for `domain/` (no `page`/`layout`/`route` files there). Add a test fixture for `domain/x/actions.ts` compliant/violating to `tests/scripts/check-admin-auth.test.ts`.

- [ ] **Step 11: Commit**

```powershell
git add domain/clients/ app/admin/(protected)/clientes/novo/ components/admin/client-form.tsx components/admin/form-status.tsx components/admin/submit-button.tsx tests/domain/clients-form-schema.test.ts scripts/check-admin-auth.mjs tests/scripts/check-admin-auth.test.ts
git commit -m "$(cat <<'EOF'
SCL-204: create client form and wrapped server action

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 12: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-204, `DONE`. Record: `createClientAction` through `defineAdminAction`; audit event on create; the `check-admin-auth` guard extension to `domain/**/actions.ts`; `ClientForm`/`SubmitButton`/`FormStatus` reused by SCL-203 and later forms. Commit: `SCL-204: mark task DONE in docs/TASKS.md`.

---

### Task 5: SCL-203 — Client detail (ficha da cliente)

**Files:**
- Modify: `domain/clients/queries.ts` (add `getClientDetail`)
- Test: `tests/domain/client-detail.test.ts` (pure `summarizeClientHistory`)
- Create: `app/admin/(protected)/clientes/[id]/page.tsx`
- Create: `app/admin/(protected)/clientes/[id]/editar/page.tsx`
- Create: `components/admin/detail-section.tsx`

**Interfaces:**
- Consumes: `db`; `clients`, `shoots`, `experiencePackages`, `payments` (`db/schema`); `calculateBalance` (`domain/payments/balance.ts`); `updateClientAction` (`domain/clients/actions.ts`); `ClientForm`; `formatBRL`, `formatShootDate`; `Card`, `Badge`, `PageHeader`.
- Produces:
  - `type ClientShootSummary = { id: string; packageName: string; shootDate: string; status: string; agreedPrice: string; confirmedPaid: string; balance: string }`
  - `type ClientDetail = { client: Client; shoots: ClientShootSummary[]; lifetimeRevenue: string; openBalance: string }`
  - `summarizeClientHistory(shoots: { id: string; packageName: string; shootDate: string; status: string; agreedPrice: string }[], payments: { shootId: string; amount: string; status: "pendente" | "confirmado" | "estornado" }[]): { rows: ClientShootSummary[]; lifetimeRevenue: string; openBalance: string }` — pure, tested
  - `getClientDetail(id: string): Promise<ClientDetail | null>`

- [ ] **Step 1: Write the failing test for `summarizeClientHistory`**

Create `tests/domain/client-detail.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { summarizeClientHistory } from "@/domain/clients/queries";

describe("summarizeClientHistory", () => {
  const shoots = [
    { id: "s1", packageName: "Aurora", shootDate: "2026-03-01", status: "entregue", agreedPrice: "2000.00" },
    { id: "s2", packageName: "Bella", shootDate: "2026-09-01", status: "reserva", agreedPrice: "1500.00" },
  ];
  const payments = [
    { shootId: "s1", amount: "2000.00", status: "confirmado" as const },
    { shootId: "s2", amount: "500.00", status: "confirmado" as const },
    { shootId: "s2", amount: "300.00", status: "pendente" as const },
  ];

  it("computes per-shoot confirmed paid and balance from calculateBalance", () => {
    const { rows } = summarizeClientHistory(shoots, payments);
    expect(rows.find((r) => r.id === "s1")).toMatchObject({ confirmedPaid: "2000.00", balance: "0.00" });
    expect(rows.find((r) => r.id === "s2")).toMatchObject({ confirmedPaid: "500.00", balance: "1000.00" });
  });

  it("lifetime revenue is the sum of confirmed payments across all shoots", () => {
    expect(summarizeClientHistory(shoots, payments).lifetimeRevenue).toBe("2500.00");
  });

  it("open balance sums only positive per-shoot balances", () => {
    expect(summarizeClientHistory(shoots, payments).openBalance).toBe("1000.00");
  });

  it("handles a client with no shoots", () => {
    expect(summarizeClientHistory([], [])).toEqual({ rows: [], lifetimeRevenue: "0.00", openBalance: "0.00" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `summarizeClientHistory` is not exported from `@/domain/clients/queries`.

- [ ] **Step 3: Implement `summarizeClientHistory` + `getClientDetail`**

Append to `domain/clients/queries.ts`:

```ts
import { eq } from "drizzle-orm";
import { shoots, experiencePackages, payments, type Client } from "@/db/schema";
import { calculateBalance } from "@/domain/payments/balance";

export type ClientShootSummary = {
  id: string;
  packageName: string;
  shootDate: string;
  status: string;
  agreedPrice: string;
  confirmedPaid: string;
  balance: string;
};

export type ClientDetail = {
  client: Client;
  shoots: ClientShootSummary[];
  lifetimeRevenue: string;
  openBalance: string;
};

function addDecimal(a: string, b: string): string {
  return calculateBalance(a, [{ amount: b, status: "estornado" }]) === a
    ? sumViaBalance(a, b)
    : sumViaBalance(a, b);
}

// Reuse calculateBalance's fixed-point core by treating "sum" as agreedPrice minus
// a negative: a + b == calculateBalance(a, [{amount: `-b`, status: "confirmado"}]).
function sumViaBalance(a: string, b: string): string {
  const negB = b.startsWith("-") ? b.slice(1) : `-${b}`;
  return calculateBalance(a, [{ amount: negB, status: "confirmado" }]);
}

export function summarizeClientHistory(
  shootRows: { id: string; packageName: string; shootDate: string; status: string; agreedPrice: string }[],
  paymentRows: { shootId: string; amount: string; status: "pendente" | "confirmado" | "estornado" }[],
): { rows: ClientShootSummary[]; lifetimeRevenue: string; openBalance: string } {
  const byShoot = new Map<string, typeof paymentRows>();
  for (const p of paymentRows) {
    const list = byShoot.get(p.shootId) ?? [];
    list.push(p);
    byShoot.set(p.shootId, list);
  }

  let lifetimeRevenue = "0.00";
  let openBalance = "0.00";

  const rows = shootRows.map((s): ClientShootSummary => {
    const ps = byShoot.get(s.id) ?? [];
    const confirmedPaid = ps
      .filter((p) => p.status === "confirmado")
      .reduce((acc, p) => sumViaBalance(acc, p.amount), "0.00");
    const balance = calculateBalance(s.agreedPrice, ps);
    lifetimeRevenue = sumViaBalance(lifetimeRevenue, confirmedPaid);
    if (!balance.startsWith("-") && balance !== "0.00") {
      openBalance = sumViaBalance(openBalance, balance);
    }
    return {
      id: s.id,
      packageName: s.packageName,
      shootDate: s.shootDate,
      status: s.status,
      agreedPrice: s.agreedPrice,
      confirmedPaid,
      balance,
    };
  });

  return { rows, lifetimeRevenue, openBalance };
}

export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) return null;

  const shootRows = await db
    .select({
      id: shoots.id,
      packageName: experiencePackages.name,
      shootDate: shoots.shootDate,
      status: shoots.status,
      agreedPrice: shoots.agreedPrice,
    })
    .from(shoots)
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .where(eq(shoots.clientId, id));

  const shootIds = shootRows.map((s) => s.id);
  const paymentRows = shootIds.length
    ? await db
        .select({ shootId: payments.shootId, amount: payments.amount, status: payments.status })
        .from(payments)
        .where(inArray(payments.shootId, shootIds))
    : [];

  const { rows, lifetimeRevenue, openBalance } = summarizeClientHistory(shootRows, paymentRows);
  return { client, shoots: rows, lifetimeRevenue, openBalance };
}
```

> Add `inArray` to the existing `drizzle-orm` import at the top of the file, and remove the unused `addDecimal` helper — it was a thinking aid; only `sumViaBalance` is needed. Final import line: `import { and, or, ilike, sql, desc, count, eq, inArray, type SQL } from "drizzle-orm";`

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Detail section component**

Create `components/admin/detail-section.tsx`:

```tsx
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 font-serif text-lg font-light text-ink">{title}</h2>
      {children}
    </Card>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between border-b border-line py-2 font-sans text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
```

- [ ] **Step 6: Client detail page**

Create `app/admin/(protected)/clientes/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientDetail } from "@/domain/clients/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailSection, DetailRow } from "@/components/admin/detail-section";
import { formatBRL, formatShootDate } from "@/lib/format";
import type { ClientShootSummary } from "@/domain/clients/queries";

type Params = Promise<{ id: string }>;

const shootColumns: Column<ClientShootSummary>[] = [
  {
    key: "package",
    header: "Experiência",
    render: (r) => (
      <Link href={`/admin/agenda/${r.id}`} className="text-ink underline-offset-2 hover:underline">
        {r.packageName}
      </Link>
    ),
  },
  { key: "date", header: "Data", render: (r) => formatShootDate(r.shootDate) },
  { key: "status", header: "Status", render: (r) => <Badge>{r.status}</Badge> },
  { key: "price", header: "Valor", render: (r) => formatBRL(r.agreedPrice) },
  { key: "paid", header: "Pago", render: (r) => formatBRL(r.confirmedPaid) },
  {
    key: "balance",
    header: "Saldo",
    render: (r) => (
      <span className={r.balance.startsWith("-") || r.balance === "0.00" ? "text-muted" : "text-danger"}>
        {formatBRL(r.balance)}
      </span>
    ),
  },
];

export default async function ClientDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();

  const { client, shoots, lifetimeRevenue, openBalance } = detail;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={client.name}
        description={client.instagramHandle ? `@${client.instagramHandle}` : undefined}
        action={
          <Link
            href={`/admin/clientes/${id}/editar`}
            className="border border-line px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:border-ink"
          >
            Editar
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection title="Dados">
          <DetailRow label="Telefone" value={client.phone ?? "—"} />
          <DetailRow label="E-mail" value={client.email ?? "—"} />
          <DetailRow label="Aniversário" value={client.birthday ?? "—"} />
          <DetailRow label="Origem" value={client.source ?? "—"} />
          <DetailRow label="Perfil de estilo" value={client.styleProfile ?? "—"} />
          <DetailRow
            label="Consentimento de marketing"
            value={client.marketingConsent ? "Sim" : "Não"}
          />
        </DetailSection>

        <DetailSection title="Relacionamento">
          <DetailRow label="Receita acumulada" value={formatBRL(lifetimeRevenue)} />
          <DetailRow label="Saldo em aberto" value={formatBRL(openBalance)} />
          <DetailRow label="Ensaios" value={String(shoots.length)} />
          {client.notes ? (
            <p className="mt-3 whitespace-pre-wrap font-sans text-sm text-muted">{client.notes}</p>
          ) : null}
        </DetailSection>
      </div>

      <DetailSection title="Histórico de ensaios">
        <DataTable
          columns={shootColumns}
          rows={shoots}
          rowKey={(r) => r.id}
          empty={<EmptyState title="Nenhum ensaio" description="Esta cliente ainda não tem ensaios." />}
        />
      </DetailSection>
    </div>
  );
}
```

- [ ] **Step 7: Edit-client page**

Create `app/admin/(protected)/clientes/[id]/editar/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getClientById } from "@/domain/clients/service";
import { updateClientAction } from "@/domain/clients/actions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EditClientForm } from "./edit-client-form";

type Params = Promise<{ id: string }>;

export default async function EditClientPage({ params }: { params: Params }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  return (
    <div>
      <PageHeader title={`Editar — ${client.name}`} />
      <Card>
        <EditClientForm
          id={id}
          initialValues={{
            name: client.name,
            phone: client.phone,
            email: client.email,
            instagramHandle: client.instagramHandle,
            birthday: client.birthday,
            source: client.source,
            styleProfile: client.styleProfile,
            notes: client.notes,
            marketingConsent: client.marketingConsent,
          }}
        />
      </Card>
    </div>
  );
}
```

Create `app/admin/(protected)/clientes/[id]/editar/edit-client-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { updateClientAction } from "@/domain/clients/actions";
import { ClientForm } from "@/components/admin/client-form";
import type { ActionResult } from "@/lib/auth/admin-action";

type Values = React.ComponentProps<typeof ClientForm>["initialValues"];

export function EditClientForm({ id, initialValues }: { id: string; initialValues: Values }) {
  const router = useRouter();

  async function action(raw: unknown): Promise<ActionResult<{ id: string }>> {
    const result = await updateClientAction(raw);
    if (result.ok) router.push(`/admin/clientes/${id}`);
    return result;
  }

  return <ClientForm action={action} initialValues={initialValues} submitLabel="Salvar" hiddenId={id} />;
}
```

- [ ] **Step 8: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green.

- [ ] **Step 9: Commit**

```powershell
git add domain/clients/queries.ts "app/admin/(protected)/clientes/[id]/" components/admin/detail-section.tsx tests/domain/client-detail.test.ts
git commit -m "$(cat <<'EOF'
SCL-203: client detail with derived history, revenue, and edit

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-203, `DONE`. Note: history/revenue/balance all derived via `calculateBalance` (no stored aggregates — PRD §7.2); `summarizeClientHistory` pure and tested; edit reuses `ClientForm`. Commit: `SCL-203: mark task DONE in docs/TASKS.md`.

---

### Task 6: SCL-210 — Agenda / shoot list

**Files:**
- Create: `domain/shoots/queries.ts`
- Test: `tests/domain/shoots-queries.test.ts`
- Create: `app/admin/(protected)/agenda/page.tsx`
- Create: `components/admin/filter-bar.tsx`

**Interfaces:**
- Consumes: `db`; `shoots`, `clients`, `experiencePackages` (`db/schema`); `shootStatusValues` (`domain/shoots/schema.ts`); `DataTable`, `Badge`, `PageHeader`, `EmptyState`; `SearchInput`, `Pagination` (Task 3); `formatShootDate`, `formatBRL`.
- Produces:
  - `type ShootListRow = { id: string; clientName: string; packageName: string; shootDate: string; startTime: string | null; status: string; paymentStatus: string; agreedPrice: string }`
  - `type ShootListResult = { rows: ShootListRow[]; total: number; page: number; pageSize: number }`
  - `normalizeShootFilters(raw: { search?: string; status?: string; from?: string; to?: string; page?: string | number }): { search?: string; status?: string; from?: string; to?: string; page: number; pageSize: number }` — pure, tested
  - `listShoots(params: Parameters<typeof normalizeShootFilters>[0]): Promise<ShootListResult>`

- [ ] **Step 1: Write the failing test for `normalizeShootFilters`**

Create `tests/domain/shoots-queries.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeShootFilters } from "@/domain/shoots/queries";

describe("normalizeShootFilters", () => {
  it("defaults page 1, pageSize 25, everything else undefined", () => {
    expect(normalizeShootFilters({})).toEqual({
      search: undefined,
      status: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      pageSize: 25,
    });
  });

  it("keeps only a status that is a real shoot_status value", () => {
    expect(normalizeShootFilters({ status: "edicao" }).status).toBe("edicao");
    expect(normalizeShootFilters({ status: "bogus" }).status).toBeUndefined();
  });

  it("keeps only ISO date strings for from/to", () => {
    expect(normalizeShootFilters({ from: "2026-01-01", to: "2026-12-31" })).toMatchObject({
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(normalizeShootFilters({ from: "01/01/2026" }).from).toBeUndefined();
  });

  it("trims search and clamps page", () => {
    expect(normalizeShootFilters({ search: "  ana ", page: "0" })).toMatchObject({ search: "ana", page: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/shoots/queries` has no exports.

- [ ] **Step 3: Implement `domain/shoots/queries.ts`**

```ts
import { and, or, ilike, eq, gte, lte, desc, count, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { shoots, clients, experiencePackages } from "@/db/schema";
import { shootStatusValues } from "./schema";

export type ShootListRow = {
  id: string;
  clientName: string;
  packageName: string;
  shootDate: string;
  startTime: string | null;
  status: string;
  paymentStatus: string;
  agreedPrice: string;
};

export type ShootListResult = {
  rows: ShootListRow[];
  total: number;
  page: number;
  pageSize: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeShootFilters(raw: {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string | number;
}): { search?: string; status?: string; from?: string; to?: string; page: number; pageSize: number } {
  const search = typeof raw.search === "string" && raw.search.trim() !== "" ? raw.search.trim() : undefined;
  const status =
    typeof raw.status === "string" && (shootStatusValues as readonly string[]).includes(raw.status)
      ? raw.status
      : undefined;
  const from = typeof raw.from === "string" && ISO_DATE.test(raw.from) ? raw.from : undefined;
  const to = typeof raw.to === "string" && ISO_DATE.test(raw.to) ? raw.to : undefined;
  const page = Math.max(1, Math.floor(Number(raw.page ?? 1)) || 1);
  return { search, status, from, to, page, pageSize: 25 };
}

export async function listShoots(params: Parameters<typeof normalizeShootFilters>[0]): Promise<ShootListResult> {
  const f = normalizeShootFilters(params);

  const predicates: SQL[] = [];
  if (f.search) {
    const like = `%${f.search}%`;
    predicates.push(or(ilike(clients.name, like), ilike(experiencePackages.name, like)) as SQL);
  }
  if (f.status) predicates.push(eq(shoots.status, f.status as (typeof shootStatusValues)[number]));
  if (f.from) predicates.push(gte(shoots.shootDate, f.from));
  if (f.to) predicates.push(lte(shoots.shootDate, f.to));
  const where = predicates.length ? and(...predicates) : sql`true`;

  const [{ total }] = await db
    .select({ total: count() })
    .from(shoots)
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .where(where);

  const rows = await db
    .select({
      id: shoots.id,
      clientName: clients.name,
      packageName: experiencePackages.name,
      shootDate: shoots.shootDate,
      startTime: shoots.startTime,
      status: shoots.status,
      paymentStatus: shoots.paymentStatus,
      agreedPrice: shoots.agreedPrice,
    })
    .from(shoots)
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .where(where)
    .orderBy(desc(shoots.shootDate))
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize);

  return { rows, total: Number(total), page: f.page, pageSize: f.pageSize };
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Filter bar component**

Create `components/admin/filter-bar.tsx`:

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function FilterBar({
  statusOptions,
}: {
  statusOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 font-sans text-sm">
      <select
        value={params.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
      >
        <option value="">Todos os status</option>
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={params.get("from") ?? ""}
        onChange={(e) => setParam("from", e.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
        aria-label="De"
      />
      <input
        type="date"
        value={params.get("to") ?? ""}
        onChange={(e) => setParam("to", e.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
        aria-label="Até"
      />
    </div>
  );
}
```

- [ ] **Step 6: Agenda page**

Create `app/admin/(protected)/agenda/page.tsx`:

```tsx
import Link from "next/link";
import { listShoots } from "@/domain/shoots/queries";
import { shootStatusValues } from "@/domain/shoots/schema";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/admin/search-input";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination } from "@/components/admin/pagination";
import { formatShootDate, formatBRL } from "@/lib/format";
import type { ShootListRow } from "@/domain/shoots/queries";

type SearchParams = Promise<{
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

const columns: Column<ShootListRow>[] = [
  {
    key: "client",
    header: "Cliente",
    render: (r) => (
      <Link href={`/admin/agenda/${r.id}`} className="text-ink underline-offset-2 hover:underline">
        {r.clientName}
      </Link>
    ),
  },
  { key: "package", header: "Experiência", render: (r) => r.packageName },
  {
    key: "date",
    header: "Data",
    render: (r) => `${formatShootDate(r.shootDate)}${r.startTime ? ` · ${r.startTime.slice(0, 5)}` : ""}`,
  },
  { key: "status", header: "Status", render: (r) => <Badge tone="active">{r.status}</Badge> },
  {
    key: "payment",
    header: "Financeiro",
    render: (r) => (
      <Badge tone={r.paymentStatus === "pago" ? "success" : r.paymentStatus === "parcial" ? "warning" : "neutral"}>
        {r.paymentStatus}
      </Badge>
    ),
  },
  { key: "price", header: "Valor", render: (r) => formatBRL(r.agreedPrice) },
];

const statusOptions = shootStatusValues.map((s) => ({ value: s, label: s }));

export default async function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const result = await listShoots(sp);

  return (
    <div>
      <PageHeader
        title="Agenda & Ensaios"
        description="Visão em lista. Filtre por status, data ou busque por cliente."
        action={
          <Link
            href="/admin/agenda/novo"
            className="border border-ink bg-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink"
          >
            Novo ensaio
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SearchInput placeholder="Buscar por cliente ou experiência…" />
        <FilterBar statusOptions={statusOptions} />
      </div>

      <DataTable
        columns={columns}
        rows={result.rows}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            title="Nenhum ensaio"
            description="Nenhum ensaio corresponde aos filtros atuais."
            action={
              <Link href="/admin/agenda/novo" className="border border-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink">
                Novo ensaio
              </Link>
            }
          />
        }
      />

      <Pagination
        basePath="/admin/agenda"
        searchParams={{ search: sp.search, status: sp.status, from: sp.from, to: sp.to }}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </div>
  );
}
```

- [ ] **Step 7: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green.

- [ ] **Step 8: Commit**

```powershell
git add domain/shoots/queries.ts app/admin/(protected)/agenda/page.tsx components/admin/filter-bar.tsx tests/domain/shoots-queries.test.ts
git commit -m "$(cat <<'EOF'
SCL-210: agenda list with status/date filters and search

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-210, `DONE`. Note: list-only view (PRD §7.4 "visão por lista no MVP"), paginated, filter by date/status/package + client search; `normalizeShootFilters` pure and tested; `FilterBar` reused by production/financial views. Commit: `SCL-210: mark task DONE in docs/TASKS.md`.

---

### Task 7: SCL-211 — Create confirmed shoot end-to-end (transactional)

**Files:**
- Create: `domain/shoots/create-confirmed-shoot.ts`
- Test: `tests/domain/create-confirmed-shoot.test.ts` (pure `buildInitialPreparationTasks` + live-DB integration guarded by `RUN_LIVE_DB_TESTS`)
- Create: `domain/shoots/form-schema.ts`
- Create: `domain/shoots/actions.ts`
- Create: `app/admin/(protected)/agenda/novo/page.tsx`
- Create: `app/admin/(protected)/agenda/novo/new-shoot-form.tsx`
- Modify: `domain/clients/queries.ts` (add `listClientOptions`)
- Create: `domain/catalog/queries.ts` (add `listActivePackages`)

**Interfaces:**
- Consumes: `db` and `db.transaction`; `createShootSchema` (`domain/shoots/schema.ts`); `createProductionJobSchema` (`domain/production/schema.ts`); `createPreparationTaskSchema` (`domain/preparation/schema.ts`); `shoots`, `productionJobs`, `preparationTasks` (`db/schema`); `recordAuditEvent`; `defineAdminAction`, `toFormAction`.
- Produces:
  - `buildInitialPreparationTasks(): { type: string; title: string; visibleToClient: boolean }[]` — the canonical starter checklist (PRD §6.2 / §7.4.2), pure and tested
  - `createConfirmedShoot(input: CreateShootInput, opts?: { portalEnabled?: boolean }): Promise<{ shoot: Shoot; productionJob: ProductionJob; preparationTaskCount: number }>` — one `db.transaction`: insert shoot → insert `production_jobs` row (`status: "aguardando"`) → insert the starter `preparation_tasks`. Rolls back all three on any failure.
  - `newShootFormSchema` — `createShootSchema` with `z.coerce` for `participantCount`, plus `portalEnabled` boolean
  - `createShootAction: (raw: unknown) => Promise<ActionResult<{ id: string }>>`
  - `listClientOptions(): Promise<{ id: string; name: string }[]>` (from `domain/clients/queries.ts`)
  - `listActivePackages(): Promise<{ id: string; name: string }[]>` (from `domain/catalog/queries.ts`)

- [ ] **Step 1: Read the Next 16 Server Actions + transactions guidance**

```powershell
Get-ChildItem node_modules/next/dist/docs/content/01-app -Recurse -Filter "*server-actions*"
```

Read whatever it lists. Confirm the pattern for calling a Server Action from a client form and for `revalidatePath`. (drizzle-orm's `db.transaction(async (tx) => { ... })` on postgres-js works on the single pooled connection — `max: 1` in `db/client.ts` — no extra config.)

- [ ] **Step 2: Write the failing test for `buildInitialPreparationTasks`**

Create `tests/domain/create-confirmed-shoot.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildInitialPreparationTasks } from "@/domain/shoots/create-confirmed-shoot";

describe("buildInitialPreparationTasks", () => {
  it("returns the canonical starter checklist", () => {
    const tasks = buildInitialPreparationTasks();
    expect(tasks.map((t) => t.type)).toEqual([
      "moodboard",
      "figurino",
      "clutch",
      "make",
      "confirmacao_horario",
      "pagamento",
    ]);
  });

  it("every task has a non-empty pt-BR title", () => {
    for (const t of buildInitialPreparationTasks()) {
      expect(t.title.length).toBeGreaterThan(0);
    }
  });

  it("the payment task is not visible to the client by default", () => {
    const pagamento = buildInitialPreparationTasks().find((t) => t.type === "pagamento");
    expect(pagamento?.visibleToClient).toBe(false);
  });

  it("client-facing prep tasks are visible to the client", () => {
    const moodboard = buildInitialPreparationTasks().find((t) => t.type === "moodboard");
    expect(moodboard?.visibleToClient).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/shoots/create-confirmed-shoot` has no exports.

- [ ] **Step 4: Implement `domain/shoots/create-confirmed-shoot.ts`**

```ts
import { db } from "@/db/client";
import { shoots, productionJobs, preparationTasks, type Shoot, type ProductionJob } from "@/db/schema";
import { createShootSchema, type CreateShootInput } from "./schema";

/**
 * PRD §6.2 / §7.4.2 "Criação de ensaio confirmado" — the checklist every confirmed
 * shoot starts with. Kept as one pure function so the set is reviewable and testable
 * without a database. `visibleToClient` mirrors what belongs in Minha Experiência
 * (Epic 3): styling-facing tasks yes; the internal payment-tracking task no.
 */
export function buildInitialPreparationTasks(): {
  type: string;
  title: string;
  visibleToClient: boolean;
}[] {
  return [
    { type: "moodboard", title: "Definir moodboard e referências", visibleToClient: true },
    { type: "figurino", title: "Escolher figurinos", visibleToClient: true },
    { type: "clutch", title: "Selecionar clutch e acessórios", visibleToClient: true },
    { type: "make", title: "Enviar referência de maquiagem", visibleToClient: true },
    { type: "confirmacao_horario", title: "Confirmar data e horário do ensaio", visibleToClient: true },
    { type: "pagamento", title: "Acompanhar pagamento do ensaio", visibleToClient: false },
  ];
}

export async function createConfirmedShoot(
  input: CreateShootInput,
  opts: { portalEnabled?: boolean } = {},
): Promise<{ shoot: Shoot; productionJob: ProductionJob; preparationTaskCount: number }> {
  const parsed = createShootSchema.parse(input);
  const starter = buildInitialPreparationTasks();

  return db.transaction(async (tx) => {
    const [shoot] = await tx
      .insert(shoots)
      .values({ ...parsed, portalEnabled: opts.portalEnabled ?? parsed.portalEnabled ?? false })
      .returning();

    const [productionJob] = await tx
      .insert(productionJobs)
      .values({ shootId: shoot.id, status: "aguardando" })
      .returning();

    await tx.insert(preparationTasks).values(
      starter.map((t) => ({
        shootId: shoot.id,
        type: t.type,
        title: t.title,
        visibleToClient: t.visibleToClient,
      })),
    );

    return { shoot, productionJob, preparationTaskCount: starter.length };
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 tests.

- [ ] **Step 6: Add the live-DB integration test**

Append to `tests/domain/create-confirmed-shoot.test.ts`:

```ts
import { afterAll, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  shoots,
  productionJobs,
  preparationTasks,
  clients,
  experiencePackages,
} from "@/db/schema";
import { createConfirmedShoot } from "@/domain/shoots/create-confirmed-shoot";

const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("createConfirmedShoot (integration)", () => {
  let clientId: string;
  let packageId: string;
  let createdShootId: string | undefined;

  beforeAll(async () => {
    const [c] = await db.insert(clients).values({ name: "Teste Epic2 SCL-211" }).returning();
    clientId = c.id;
    const [p] = await db
      .select({ id: experiencePackages.id })
      .from(experiencePackages)
      .limit(1);
    packageId = p.id;
  });

  afterAll(async () => {
    if (createdShootId) {
      await db.delete(preparationTasks).where(eq(preparationTasks.shootId, createdShootId));
      await db.delete(productionJobs).where(eq(productionJobs.shootId, createdShootId));
      await db.delete(shoots).where(eq(shoots.id, createdShootId));
    }
    await db.delete(clients).where(eq(clients.id, clientId));
  });

  it("creates shoot + production job + starter checklist atomically", async () => {
    const result = await createConfirmedShoot({
      clientId,
      experiencePackageId: packageId,
      shootDate: "2026-12-01",
      agreedPrice: "1200.00",
    });
    createdShootId = result.shoot.id;

    expect(result.productionJob.status).toBe("aguardando");
    expect(result.preparationTaskCount).toBe(6);

    const job = await db.select().from(productionJobs).where(eq(productionJobs.shootId, result.shoot.id));
    expect(job).toHaveLength(1);
    const tasks = await db
      .select()
      .from(preparationTasks)
      .where(eq(preparationTasks.shootId, result.shoot.id));
    expect(tasks).toHaveLength(6);
  });

  it("rolls back everything when the production job insert would violate the 1:1 unique constraint", async () => {
    // create one, then attempt a second confirmed shoot that reuses the same shoot row
    // is not possible directly; instead assert the unique constraint by inserting a
    // duplicate production_jobs row inside a failing transaction.
    const result = await createConfirmedShoot({
      clientId,
      experiencePackageId: packageId,
      shootDate: "2026-12-02",
      agreedPrice: "1000.00",
    });
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(productionJobs).values({ shootId: result.shoot.id, status: "aguardando" });
      }),
    ).rejects.toThrow();
    // cleanup this extra shoot
    await db.delete(preparationTasks).where(eq(preparationTasks.shootId, result.shoot.id));
    await db.delete(productionJobs).where(eq(productionJobs.shootId, result.shoot.id));
    await db.delete(shoots).where(eq(shoots.id, result.shoot.id));
  });
});
```

Run with the live DB (only against a dev/staging project):

```powershell
$env:RUN_LIVE_DB_TESTS="true"; npm run test; Remove-Item Env:RUN_LIVE_DB_TESTS
```

Expected: PASS. Without the env var, the block is skipped.

- [ ] **Step 7: Option queries**

Append to `domain/clients/queries.ts`:

```ts
import { asc } from "drizzle-orm";

export async function listClientOptions(): Promise<{ id: string; name: string }[]> {
  return db.select({ id: clients.id, name: clients.name }).from(clients).orderBy(asc(clients.name));
}
```

(Add `asc` to the top import instead of a second import line.)

Create `domain/catalog/queries.ts`:

```ts
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { experiencePackages } from "@/db/schema";

export async function listActivePackages(): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: experiencePackages.id, name: experiencePackages.name })
    .from(experiencePackages)
    .where(eq(experiencePackages.active, true))
    .orderBy(asc(experiencePackages.name));
}
```

- [ ] **Step 8: Form schema + action**

Create `domain/shoots/form-schema.ts`:

```ts
import { z } from "zod";
import { createShootSchema } from "./schema";

// createShootSchema expects participantCount as a number and portalEnabled as a
// boolean. toFormAction() already coerces declared numbers/booleans, but keep the
// schema itself tolerant of a string number in case the action is called directly.
export const newShootFormSchema = createShootSchema.extend({
  participantCount: z.coerce.number().int().positive().optional(),
  portalEnabled: z.coerce.boolean().default(false),
});

export type NewShootFormValues = z.input<typeof newShootFormSchema>;
```

Create `domain/shoots/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { createConfirmedShoot } from "./create-confirmed-shoot";
import { recordAuditEvent } from "@/domain/audit/service";
import { newShootFormSchema } from "./form-schema";

export const createShootAction = defineAdminAction(
  { role: "staff", input: newShootFormSchema },
  async (input, ctx) => {
    const { portalEnabled, ...shootInput } = input;
    const { shoot, productionJob, preparationTaskCount } = await createConfirmedShoot(shootInput, {
      portalEnabled,
    });
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "shoot.created",
      entityType: "shoot",
      entityId: shoot.id,
      before: null,
      after: {
        shoot,
        productionJobId: productionJob.id,
        preparationTaskCount,
      },
    });
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/producao");
    return { id: shoot.id };
  },
);
```

- [ ] **Step 9: New-shoot page + form**

Create `app/admin/(protected)/agenda/novo/page.tsx`:

```tsx
import { listClientOptions } from "@/domain/clients/queries";
import { listActivePackages } from "@/domain/catalog/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { NewShootForm } from "./new-shoot-form";

export default async function NewShootPage() {
  const [clients, packages] = await Promise.all([listClientOptions(), listActivePackages()]);

  return (
    <div>
      <PageHeader
        title="Novo ensaio"
        description="Cria o ensaio, o job de produção em Aguardando e o checklist inicial — em uma única operação."
      />
      <Card>
        <NewShootForm clients={clients} packages={packages} />
      </Card>
    </div>
  );
}
```

Create `app/admin/(protected)/agenda/novo/new-shoot-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createShootAction } from "@/domain/shoots/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/admin-action";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

export function NewShootForm({
  clients,
  packages,
}: {
  clients: { id: string; name: string }[];
  packages: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, fd: FormData) => {
      const result = await toFormAction(createShootAction, {
        numbers: ["participantCount"],
        booleans: ["portalEnabled"],
      })(prev, fd);
      if (result.ok) router.push(`/admin/agenda/${result.data.id}`);
      return result;
    },
    null,
  );
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      <FormStatus state={state} />

      <Field label="Cliente" htmlFor="clientId" error={err("clientId")}>
        <Select id="clientId" name="clientId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Experiência" htmlFor="experiencePackageId" error={err("experiencePackageId")}>
        <Select id="experiencePackageId" name="experiencePackageId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Data" htmlFor="shootDate" error={err("shootDate")}>
          <Input id="shootDate" name="shootDate" type="date" required />
        </Field>
        <Field label="Horário" htmlFor="startTime" hint="HH:MM" error={err("startTime")}>
          <Input id="startTime" name="startTime" type="time" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor acordado" htmlFor="agreedPrice" hint="Ex.: 1200.00" error={err("agreedPrice")}>
          <Input id="agreedPrice" name="agreedPrice" inputMode="decimal" required />
        </Field>
        <Field label="Participantes" htmlFor="participantCount" error={err("participantCount")}>
          <Input id="participantCount" name="participantCount" type="number" min={1} />
        </Field>
      </div>

      <Field label="Ocasião" htmlFor="occasion" error={err("occasion")}>
        <Input id="occasion" name="occasion" />
      </Field>
      <Field label="Indicação / origem" htmlFor="referral" error={err("referral")}>
        <Input id="referral" name="referral" />
      </Field>
      <Field label="Observações" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" />
      </Field>

      <label className="flex items-center gap-2 font-sans text-sm text-ink">
        <input type="checkbox" name="portalEnabled" defaultChecked />
        Liberar acesso da cliente ao portal (Minha Experiência)
      </label>

      <div>
        <SubmitButton>Criar ensaio</SubmitButton>
      </div>
    </form>
  );
}
```

- [ ] **Step 10: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green. Then, once, against a dev/staging DB: `$env:RUN_LIVE_DB_TESTS="true"; npm run test; Remove-Item Env:RUN_LIVE_DB_TESTS` and confirm the integration block passes.

- [ ] **Step 11: Commit**

```powershell
git add domain/shoots/ domain/catalog/queries.ts domain/clients/queries.ts app/admin/(protected)/agenda/novo/ tests/domain/create-confirmed-shoot.test.ts
git commit -m "$(cat <<'EOF'
SCL-211: transactional end-to-end confirmed-shoot creation

Creates the shoot, its Aguardando production job, and the starter preparation
checklist in one db.transaction; portal access toggled on creation.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 12: Update `docs/TASKS.md`**

Move SCL-211 to `DONE`. Update its detailed section's acceptance checkboxes. Record: single `db.transaction` covering shoot + production job + checklist (PRD §7.4.2, "operação consistente em caso de falha parcial"); `buildInitialPreparationTasks` pure/tested; live-DB integration test guarded by `RUN_LIVE_DB_TESTS` with full `afterAll` cleanup; `portal_enabled` set at creation. Note this unblocks the first E2E milestone (PRD §23). Commit: `SCL-211: mark task DONE in docs/TASKS.md`.

---

### Task 8: SCL-212 — Shoot detail (ficha do ensaio)

**Files:**
- Modify: `domain/shoots/queries.ts` (add `getShootDetail`)
- Modify: `domain/shoots/service.ts` (add `updateShoot`)
- Modify: `domain/shoots/schema.ts` (add `updateShootSchema`)
- Modify: `domain/shoots/actions.ts` (add `updateShootAction`)
- Create: `app/admin/(protected)/agenda/[id]/page.tsx`
- Create: `app/admin/(protected)/agenda/[id]/edit-shoot-panel.tsx`

**Interfaces:**
- Consumes: `db`; `shoots`, `clients`, `experiencePackages`, `payments`, `productionJobs`, `preparationTasks` (`db/schema`); `calculateBalance` (`domain/payments/balance.ts`); `defineAdminAction`; `Badge`, `Card`, `DataTable`, `PageHeader`; `formatBRL`, `formatShootDate`, `formatDateInput`.
- Produces:
  - `type ShootDetail = { shoot: Shoot; clientName: string; clientId: string; packageName: string; payments: Payment[]; balance: string; productionJob: ProductionJob | null; preparationTasks: PreparationTask[] }`
  - `getShootDetail(id: string): Promise<ShootDetail | null>`
  - `updateShootSchema` — partial of `createShootSchema` minus `paymentStatus` (never user-editable); `startTime`, `agreedPrice`, `occasion`, `referral`, `notes`, `participantCount`, `portalEnabled` editable
  - `updateShoot(id: string, input: UpdateShootInput): Promise<Shoot>`
  - `updateShootAction: (raw: unknown) => Promise<ActionResult<{ id: string }>>`

- [ ] **Step 1: `getShootDetail` query**

Append to `domain/shoots/queries.ts`:

```ts
import {
  payments as paymentsTable,
  productionJobs,
  preparationTasks,
  type Shoot,
  type Payment,
  type ProductionJob,
  type PreparationTask,
} from "@/db/schema";
import { calculateBalance } from "@/domain/payments/balance";

export type ShootDetail = {
  shoot: Shoot;
  clientName: string;
  clientId: string;
  packageName: string;
  payments: Payment[];
  balance: string;
  productionJob: ProductionJob | null;
  preparationTasks: PreparationTask[];
};

export async function getShootDetail(id: string): Promise<ShootDetail | null> {
  const [row] = await db
    .select({
      shoot: shoots,
      clientName: clients.name,
      clientId: clients.id,
      packageName: experiencePackages.name,
    })
    .from(shoots)
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .where(eq(shoots.id, id))
    .limit(1);
  if (!row) return null;

  const shootPayments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.shootId, id))
    .orderBy(desc(paymentsTable.createdAt));

  const [job] = await db
    .select()
    .from(productionJobs)
    .where(eq(productionJobs.shootId, id))
    .limit(1);

  const prep = await db
    .select()
    .from(preparationTasks)
    .where(eq(preparationTasks.shootId, id))
    .orderBy(preparationTasks.createdAt);

  return {
    shoot: row.shoot,
    clientName: row.clientName,
    clientId: row.clientId,
    packageName: row.packageName,
    payments: shootPayments,
    balance: calculateBalance(
      row.shoot.agreedPrice,
      shootPayments.map((p) => ({ amount: p.amount, status: p.status })),
    ),
    productionJob: job ?? null,
    preparationTasks: prep,
  };
}
```

> Merge the new type imports into the file's existing `@/db/schema` import; `desc` is already imported.

- [ ] **Step 2: `updateShoot` service + schema**

Append to `domain/shoots/schema.ts`:

```ts
// paymentStatus is deliberately excluded — it is a derived cache written only by
// the payment-registration action (SCL-220). Status changes go through
// changeShootStatusAction (SCL-231-adjacent), not this generic update.
export const updateShootSchema = z.object({
  startTime: z.iso.time().optional(),
  agreedPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "must be a decimal string like \"1200.00\"")
    .optional(),
  participantCount: z.coerce.number().int().positive().optional(),
  occasion: z.string().optional(),
  referral: z.string().optional(),
  notes: z.string().optional(),
  portalEnabled: z.coerce.boolean().optional(),
});

export type UpdateShootInput = z.input<typeof updateShootSchema>;
```

Append to `domain/shoots/service.ts`:

```ts
import { updateShootSchema, type UpdateShootInput } from "./schema";

export async function updateShoot(id: string, input: UpdateShootInput): Promise<Shoot> {
  const parsed = updateShootSchema.parse(input);
  const [row] = await db.update(shoots).set(parsed).where(eq(shoots.id, id)).returning();
  return row;
}
```

- [ ] **Step 3: `updateShootAction`**

Append to `domain/shoots/actions.ts`:

```ts
import { z } from "zod";
import { getShootById, updateShoot } from "./service";
import { updateShootSchema } from "./schema";

export const updateShootAction = defineAdminAction(
  { role: "staff", input: updateShootSchema.extend({ id: z.string().uuid() }) },
  async (input, ctx) => {
    const { id, ...patch } = input;
    const before = await getShootById(id);
    if (!before) throw new Error("ensaio inexistente");
    const after = await updateShoot(id, patch);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "shoot.updated",
      entityType: "shoot",
      entityId: id,
      before,
      after,
    });
    revalidatePath(`/admin/agenda/${id}`);
    revalidatePath("/admin/agenda");
    return { id };
  },
);
```

- [ ] **Step 4: Shoot detail page**

Create `app/admin/(protected)/agenda/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getShootDetail } from "@/domain/shoots/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailSection, DetailRow } from "@/components/admin/detail-section";
import { EditShootPanel } from "./edit-shoot-panel";
import { formatBRL, formatShootDate, formatDateTime } from "@/lib/format";
import type { Payment } from "@/db/schema";

type Params = Promise<{ id: string }>;

const paymentColumns: Column<Payment>[] = [
  { key: "amount", header: "Valor", render: (p) => formatBRL(p.amount) },
  { key: "status", header: "Status", render: (p) => <Badge tone={p.status === "confirmado" ? "success" : p.status === "estornado" ? "danger" : "neutral"}>{p.status}</Badge> },
  { key: "method", header: "Forma", render: (p) => p.method ?? "—" },
  { key: "paidAt", header: "Pago em", render: (p) => (p.paidAt ? formatDateTime(p.paidAt) : "—") },
];

export default async function ShootDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await getShootDetail(id);
  if (!detail) notFound();

  const { shoot, clientName, clientId, packageName, payments, balance, productionJob, preparationTasks } = detail;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${clientName} — ${packageName}`}
        description={`${formatShootDate(shoot.shootDate)}${shoot.startTime ? ` · ${shoot.startTime.slice(0, 5)}` : ""}`}
        action={
          <div className="flex gap-2">
            <Badge tone="active">{shoot.status}</Badge>
            <Badge tone={shoot.paymentStatus === "pago" ? "success" : shoot.paymentStatus === "parcial" ? "warning" : "neutral"}>
              {shoot.paymentStatus}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection title="Registro central">
          <DetailRow label="Cliente" value={<Link href={`/admin/clientes/${clientId}`} className="underline-offset-2 hover:underline">{clientName}</Link>} />
          <DetailRow label="Experiência" value={packageName} />
          <DetailRow label="Ocasião" value={shoot.occasion ?? "—"} />
          <DetailRow label="Participantes" value={shoot.participantCount ?? "—"} />
          <DetailRow label="Indicação / origem" value={shoot.referral ?? "—"} />
          <DetailRow label="Portal liberado" value={shoot.portalEnabled ? "Sim" : "Não"} />
        </DetailSection>

        <DetailSection title="Financeiro">
          <DetailRow label="Valor acordado" value={formatBRL(shoot.agreedPrice)} />
          <DetailRow label="Saldo" value={<span className={balance.startsWith("-") || balance === "0.00" ? "text-muted" : "text-danger"}>{formatBRL(balance)}</span>} />
          <DetailRow label="Status financeiro" value={shoot.paymentStatus} />
          <div className="mt-4">
            <Link
              href={`/admin/agenda/${id}/pagamento`}
              className="border border-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:bg-ink hover:text-white"
            >
              Registrar pagamento
            </Link>
          </div>
        </DetailSection>
      </div>

      <DetailSection title="Pagamentos">
        <DataTable
          columns={paymentColumns}
          rows={payments}
          rowKey={(p) => p.id}
          empty={<EmptyState title="Sem pagamentos" description="Nenhum pagamento registrado para este ensaio." />}
        />
      </DetailSection>

      <DetailSection title="Produção & experiência">
        <DetailRow label="Job de produção" value={productionJob ? <Badge>{productionJob.status}</Badge> : "—"} />
        <DetailRow label="Tarefas de preparação" value={`${preparationTasks.filter((t) => t.status === "concluida").length}/${preparationTasks.length} concluídas`} />
        <div className="mt-3">
          <Link href={`/admin/agenda/${id}/preparacao`} className="font-sans text-sm text-ink underline-offset-2 hover:underline">
            Abrir checklist de preparação
          </Link>
        </div>
      </DetailSection>

      <DetailSection title="Editar ensaio">
        <EditShootPanel
          id={id}
          initialValues={{
            startTime: shoot.startTime ?? "",
            agreedPrice: shoot.agreedPrice,
            participantCount: shoot.participantCount ?? undefined,
            occasion: shoot.occasion ?? "",
            referral: shoot.referral ?? "",
            notes: shoot.notes ?? "",
            portalEnabled: shoot.portalEnabled,
          }}
        />
      </DetailSection>
    </div>
  );
}
```

- [ ] **Step 5: Edit-shoot panel**

Create `app/admin/(protected)/agenda/[id]/edit-shoot-panel.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateShootAction } from "@/domain/shoots/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/admin-action";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

export function EditShootPanel({
  id,
  initialValues,
}: {
  id: string;
  initialValues: {
    startTime: string;
    agreedPrice: string;
    participantCount?: number;
    occasion: string;
    referral: string;
    notes: string;
    portalEnabled: boolean;
  };
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, fd: FormData) => {
      const result = await toFormAction(updateShootAction, {
        numbers: ["participantCount"],
        booleans: ["portalEnabled"],
      })(prev, fd);
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <FormStatus state={state} />
      {state && state.ok ? <p className="font-sans text-sm text-[#1e7d4f]">Ensaio atualizado.</p> : null}
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Horário" htmlFor="startTime" error={err("startTime")}>
          <Input id="startTime" name="startTime" type="time" defaultValue={initialValues.startTime} />
        </Field>
        <Field label="Valor acordado" htmlFor="agreedPrice" error={err("agreedPrice")}>
          <Input id="agreedPrice" name="agreedPrice" inputMode="decimal" defaultValue={initialValues.agreedPrice} />
        </Field>
      </div>
      <Field label="Participantes" htmlFor="participantCount" error={err("participantCount")}>
        <Input id="participantCount" name="participantCount" type="number" min={1} defaultValue={initialValues.participantCount ?? ""} />
      </Field>
      <Field label="Ocasião" htmlFor="occasion" error={err("occasion")}>
        <Input id="occasion" name="occasion" defaultValue={initialValues.occasion} />
      </Field>
      <Field label="Indicação / origem" htmlFor="referral" error={err("referral")}>
        <Input id="referral" name="referral" defaultValue={initialValues.referral} />
      </Field>
      <Field label="Observações" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" defaultValue={initialValues.notes} />
      </Field>
      <label className="flex items-center gap-2 font-sans text-sm text-ink">
        <input type="checkbox" name="portalEnabled" defaultChecked={initialValues.portalEnabled} />
        Portal liberado
      </label>
      <div>
        <SubmitButton>Salvar alterações</SubmitButton>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green.

- [ ] **Step 7: Commit**

```powershell
git add domain/shoots/ "app/admin/(protected)/agenda/[id]/page.tsx" "app/admin/(protected)/agenda/[id]/edit-shoot-panel.tsx"
git commit -m "$(cat <<'EOF'
SCL-212: shoot detail with derived balance and inline editing

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-212, `DONE`. Note: single ficha showing central record + financeiro (derived balance via `calculateBalance`) + produção + preparação (PRD §7.4); `updateShootSchema` excludes `paymentStatus` (derived) and `status` (goes through the dedicated status action). Commit: `SCL-212: mark task DONE in docs/TASKS.md`.

---

### Task 9: SCL-220 — Register payment (derived balance + status)

**Files:**
- Create: `domain/payments/register-payment.ts`
- Test: `tests/domain/register-payment.test.ts` (pure planner + live-DB integration guarded)
- Create: `domain/payments/actions.ts`
- Create: `app/admin/(protected)/agenda/[id]/pagamento/page.tsx`
- Create: `app/admin/(protected)/agenda/[id]/pagamento/payment-form.tsx`

**Interfaces:**
- Consumes: `db`, `db.transaction`; `payments`, `shoots` (`db/schema`); `createPaymentSchema` (`domain/payments/schema.ts`); `calculateBalance`, `deriveShootPaymentStatus` (`domain/payments/balance.ts`); `getPaymentsByShootId` (`domain/payments/service.ts`); `recordAuditEvent`; `defineAdminAction`, `toFormAction`.
- Produces:
  - `planPaymentStatusUpdate(agreedPrice: string, existingPayments: PaymentForBalance[], newPayment: PaymentForBalance): { nextStatus: "nao_iniciado" | "parcial" | "pago"; nextBalance: string }` — pure, tested: applies `deriveShootPaymentStatus`/`calculateBalance` to the set including the new row
  - `registerPayment(input: CreatePaymentInput): Promise<{ payment: Payment; shootPaymentStatus: string; balance: string }>` — one `db.transaction`: insert payment → recompute over all rows → write `shoots.payment_status` cache. Never touches `payment_status` outside this function.
  - `registerPaymentAction: (raw: unknown) => Promise<ActionResult<{ shootId: string }>>`

- [ ] **Step 1: Write the failing test for `planPaymentStatusUpdate`**

Create `tests/domain/register-payment.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { planPaymentStatusUpdate } from "@/domain/payments/register-payment";

describe("planPaymentStatusUpdate", () => {
  it("stays nao_iniciado when the new payment is only pendente", () => {
    const r = planPaymentStatusUpdate("1000.00", [], { amount: "400.00", status: "pendente" });
    expect(r).toEqual({ nextStatus: "nao_iniciado", nextBalance: "1000.00" });
  });

  it("becomes parcial when a confirmed payment covers part of the agreed price", () => {
    const r = planPaymentStatusUpdate("1000.00", [], { amount: "400.00", status: "confirmado" });
    expect(r).toEqual({ nextStatus: "parcial", nextBalance: "600.00" });
  });

  it("becomes pago when confirmed payments reach the agreed price", () => {
    const r = planPaymentStatusUpdate(
      "1000.00",
      [{ amount: "600.00", status: "confirmado" }],
      { amount: "400.00", status: "confirmado" },
    );
    expect(r).toEqual({ nextStatus: "pago", nextBalance: "0.00" });
  });

  it("reports a negative balance on overpayment without clamping", () => {
    const r = planPaymentStatusUpdate(
      "1000.00",
      [{ amount: "800.00", status: "confirmado" }],
      { amount: "400.00", status: "confirmado" },
    );
    expect(r).toEqual({ nextStatus: "pago", nextBalance: "-200.00" });
  });

  it("ignores estornado rows in both existing and new", () => {
    const r = planPaymentStatusUpdate(
      "1000.00",
      [{ amount: "1000.00", status: "estornado" }],
      { amount: "1000.00", status: "estornado" },
    );
    expect(r).toEqual({ nextStatus: "nao_iniciado", nextBalance: "1000.00" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/payments/register-payment` has no exports.

- [ ] **Step 3: Implement `domain/payments/register-payment.ts`**

```ts
import { db } from "@/db/client";
import { payments, shoots, type Payment } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateBalance, deriveShootPaymentStatus } from "./balance";
import { createPaymentSchema, type CreatePaymentInput } from "./schema";

type PaymentForBalance = { amount: string; status: "pendente" | "confirmado" | "estornado" };

/**
 * Pure planner: given the agreed price, the payments already on the shoot, and the
 * one about to be added, what does the derived cache become? Delegates entirely to
 * the Epic 1 functions — no arithmetic of its own — so PRD §7.5's single source of
 * truth stays single.
 */
export function planPaymentStatusUpdate(
  agreedPrice: string,
  existingPayments: PaymentForBalance[],
  newPayment: PaymentForBalance,
): { nextStatus: "nao_iniciado" | "parcial" | "pago"; nextBalance: string } {
  const all = [...existingPayments, newPayment];
  return {
    nextStatus: deriveShootPaymentStatus(agreedPrice, all),
    nextBalance: calculateBalance(agreedPrice, all),
  };
}

export async function registerPayment(
  input: CreatePaymentInput,
): Promise<{ payment: Payment; shootPaymentStatus: string; balance: string }> {
  const parsed = createPaymentSchema.parse(input);

  return db.transaction(async (tx) => {
    const [shoot] = await tx
      .select({ id: shoots.id, agreedPrice: shoots.agreedPrice })
      .from(shoots)
      .where(eq(shoots.id, parsed.shootId))
      .limit(1);
    if (!shoot) throw new Error("ensaio inexistente");

    const [payment] = await tx.insert(payments).values(parsed).returning();

    const rows = await tx
      .select({ amount: payments.amount, status: payments.status })
      .from(payments)
      .where(eq(payments.shootId, parsed.shootId));

    const nextStatus = deriveShootPaymentStatus(shoot.agreedPrice, rows);
    const balance = calculateBalance(shoot.agreedPrice, rows);

    await tx.update(shoots).set({ paymentStatus: nextStatus }).where(eq(shoots.id, parsed.shootId));

    return { payment, shootPaymentStatus: nextStatus, balance };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Live-DB integration test**

Append to `tests/domain/register-payment.test.ts`:

```ts
import { afterAll, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { payments, shoots, clients, experiencePackages } from "@/db/schema";
import { registerPayment } from "@/domain/payments/register-payment";

const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("registerPayment (integration)", () => {
  let clientId: string;
  let shootId: string;

  beforeAll(async () => {
    const [c] = await db.insert(clients).values({ name: "Teste Epic2 SCL-220" }).returning();
    clientId = c.id;
    const [p] = await db.select({ id: experiencePackages.id }).from(experiencePackages).limit(1);
    const [s] = await db
      .insert(shoots)
      .values({ clientId, experiencePackageId: p.id, shootDate: "2026-12-01", agreedPrice: "1000.00" })
      .returning();
    shootId = s.id;
  });

  afterAll(async () => {
    await db.delete(payments).where(eq(payments.shootId, shootId));
    await db.delete(shoots).where(eq(shoots.id, shootId));
    await db.delete(clients).where(eq(clients.id, clientId));
  });

  it("writes the payment and updates shoots.payment_status to the derived value", async () => {
    const r1 = await registerPayment({ shootId, amount: "400.00", status: "confirmado" });
    expect(r1.shootPaymentStatus).toBe("parcial");
    expect(r1.balance).toBe("600.00");

    const [afterFirst] = await db
      .select({ ps: shoots.paymentStatus })
      .from(shoots)
      .where(eq(shoots.id, shootId));
    expect(afterFirst.ps).toBe("parcial");

    const r2 = await registerPayment({ shootId, amount: "600.00", status: "confirmado" });
    expect(r2.shootPaymentStatus).toBe("pago");
    expect(r2.balance).toBe("0.00");
  });
});
```

Run once against a dev/staging DB with `RUN_LIVE_DB_TESTS=true`. Expected: PASS.

- [ ] **Step 6: `registerPaymentAction`**

Create `domain/payments/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { registerPayment } from "./register-payment";
import { createPaymentSchema } from "./schema";
import { recordAuditEvent } from "@/domain/audit/service";

export const registerPaymentAction = defineAdminAction(
  { role: "staff", input: createPaymentSchema },
  async (input, ctx) => {
    const { payment, shootPaymentStatus, balance } = await registerPayment(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "payment.registered",
      entityType: "payment",
      entityId: payment.id,
      before: null,
      after: { payment, shootPaymentStatus, balance },
    });
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath("/admin/financeiro");
    revalidatePath("/admin");
    return { shootId: input.shootId };
  },
);
```

- [ ] **Step 7: Payment page + form**

Create `app/admin/(protected)/agenda/[id]/pagamento/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getShootDetail } from "@/domain/shoots/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PaymentForm } from "./payment-form";
import { formatBRL } from "@/lib/format";

type Params = Promise<{ id: string }>;

export default async function RegisterPaymentPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await getShootDetail(id);
  if (!detail) notFound();

  return (
    <div>
      <PageHeader
        title="Registrar pagamento"
        description={`${detail.clientName} — ${detail.packageName} · saldo atual ${formatBRL(detail.balance)}`}
      />
      <Card>
        <PaymentForm shootId={id} />
      </Card>
    </div>
  );
}
```

Create `app/admin/(protected)/agenda/[id]/pagamento/payment-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { registerPaymentAction } from "@/domain/payments/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/admin-action";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

export function PaymentForm({ shootId }: { shootId: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ shootId: string }> | null, fd: FormData) => {
      const result = await toFormAction(registerPaymentAction)(prev, fd);
      if (result.ok) router.push(`/admin/agenda/${result.data.shootId}`);
      return result;
    },
    null,
  );
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      <FormStatus state={state} />
      <input type="hidden" name="shootId" value={shootId} />

      <Field label="Valor" htmlFor="amount" hint="Ex.: 400.00" error={err("amount")}>
        <Input id="amount" name="amount" inputMode="decimal" required />
      </Field>
      <Field label="Status" htmlFor="status" error={err("status")}>
        <Select id="status" name="status" defaultValue="confirmado">
          <option value="pendente">Pendente</option>
          <option value="confirmado">Confirmado</option>
          <option value="estornado">Estornado</option>
        </Select>
      </Field>
      <Field label="Forma de pagamento" htmlFor="method" error={err("method")}>
        <Input id="method" name="method" placeholder="Pix, cartão, dinheiro…" />
      </Field>
      <Field label="Data do pagamento" htmlFor="paidAtLocal" hint="Opcional" error={err("paidAt")}>
        <Input id="paidAtLocal" name="paidAtLocal" type="datetime-local" />
      </Field>
      <Field label="Comprovante (URL)" htmlFor="proofUrl" error={err("proofUrl")}>
        <Input id="proofUrl" name="proofUrl" type="url" />
      </Field>
      <Field label="Observações" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" />
      </Field>

      <div>
        <SubmitButton>Registrar</SubmitButton>
      </div>
    </form>
  );
}
```

> **`paidAt` needs an explicit offset.** `createPaymentSchema.paidAt` is `z.iso.datetime({ offset: true })` (Epic 1, `domain/payments/schema.ts` — verified), which rejects the `"YYYY-MM-DDTHH:mm"` an `<input type="datetime-local">` produces (no seconds, no offset). So the field is named `paidAtLocal` and the form maps it to a valid `paidAt` before calling the action. Replace the `useActionState` reducer with one that rewrites the value:
>
> ```tsx
> const [state, formAction] = useActionState(
>   async (prev: ActionResult<{ shootId: string }> | null, fd: FormData) => {
>     const local = fd.get("paidAtLocal");
>     fd.delete("paidAtLocal");
>     if (typeof local === "string" && local !== "") {
>       // "2026-10-18T14:30" -> "2026-10-18T14:30:00Z" (Z is an accepted offset)
>       fd.set("paidAt", local.length === 16 ? `${local}:00Z` : `${local}Z`);
>     }
>     const result = await toFormAction(registerPaymentAction)(prev, fd);
>     if (result.ok) router.push(`/admin/agenda/${result.data.shootId}`);
>     return result;
>   },
>   null,
> );
> ```
>
> Do not loosen the Epic 1 schema.

- [ ] **Step 8: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green. Then once with `RUN_LIVE_DB_TESTS=true` against dev/staging.

- [ ] **Step 9: Commit**

```powershell
git add domain/payments/ "app/admin/(protected)/agenda/[id]/pagamento/" tests/domain/register-payment.test.ts
git commit -m "$(cat <<'EOF'
SCL-220: register payment, derive balance and payment_status in one transaction

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10: Update `docs/TASKS.md`**

Move SCL-220 to `DONE`; update its acceptance checkboxes. Record: payment written once; `shoots.payment_status` recomputed and cached in the **same** `db.transaction` and nowhere else; only `confirmado` rows count; overpayment yields a negative balance, not clamped; `planPaymentStatusUpdate` pure/tested; live-DB integration guarded. Note this + SCL-211 complete the E2E milestone spine. Commit: `SCL-220: mark task DONE in docs/TASKS.md`.

---

### Task 10: SCL-221 — Financial ledger + financial dashboard

**Files:**
- Create: `domain/finance/ledger.ts`
- Test: `tests/domain/finance-ledger.test.ts`
- Create: `domain/finance/queries.ts`
- Create: `app/admin/(protected)/financeiro/page.tsx`
- Create: `components/admin/period-picker.tsx`

**Interfaces:**
- Consumes: `db`; `shoots`, `clients`, `payments`, `expenses` (`db/schema`); `computeDashboardKpis` is **not** reused here (different granularity); this task has its own pure reducer; `formatBRL`, `formatShootDate`; `DataTable`, `Card`, `PageHeader`, `KpiTile`.
- Produces:
  - `type LedgerEntry = { date: string; kind: "recebimento" | "despesa"; description: string; amount: string; signedAmount: string }`
  - `type LedgerSummary = { received: string; expenses: string; net: string; receivable: string }`
  - `buildLedger(input: { payments: { paidAt: string | null; createdAt: string; amount: string; status: string; clientName: string }[]; expenses: { date: string; category: string | null; type: string; amount: string }[]; openReceivable: string }): { entries: LedgerEntry[]; summary: LedgerSummary }` — pure, tested; entries sorted by date desc, `signedAmount` negative for despesa
  - `getFinancialLedger(range: { from: string; to: string }): Promise<{ entries: LedgerEntry[]; summary: LedgerSummary }>`

- [ ] **Step 1: Write the failing test for `buildLedger`**

Create `tests/domain/finance-ledger.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildLedger } from "@/domain/finance/ledger";

const input = {
  payments: [
    { paidAt: "2026-09-10T12:00:00Z", createdAt: "2026-09-10T12:00:00Z", amount: "800.00", status: "confirmado", clientName: "Ana" },
    { paidAt: null, createdAt: "2026-09-12T09:00:00Z", amount: "300.00", status: "pendente", clientName: "Bia" },
    { paidAt: "2026-09-05T08:00:00Z", createdAt: "2026-09-05T08:00:00Z", amount: "500.00", status: "estornado", clientName: "Cléo" },
  ],
  expenses: [
    { date: "2026-09-08", category: "Equipamento", type: "investimento", amount: "1200.00" },
    { date: "2026-09-15", category: "Aluguel", type: "custo", amount: "900.00" },
  ],
  openReceivable: "2000.00",
};

describe("buildLedger", () => {
  it("includes only confirmed receipts and all expenses", () => {
    const { entries } = buildLedger(input);
    expect(entries.filter((e) => e.kind === "recebimento")).toHaveLength(1);
    expect(entries.filter((e) => e.kind === "despesa")).toHaveLength(2);
  });

  it("sorts entries by date descending", () => {
    const { entries } = buildLedger(input);
    expect(entries.map((e) => e.date)).toEqual(["2026-09-15", "2026-09-10", "2026-09-08"]);
  });

  it("signs expense amounts negative and receipts positive", () => {
    const { entries } = buildLedger(input);
    expect(entries.find((e) => e.description.includes("Ana"))?.signedAmount).toBe("800.00");
    expect(entries.find((e) => e.description.includes("Aluguel"))?.signedAmount).toBe("-900.00");
  });

  it("summary: received, expenses, net, and passed-through receivable", () => {
    const { summary } = buildLedger(input);
    expect(summary.received).toBe("800.00");
    expect(summary.expenses).toBe("2100.00");
    expect(summary.net).toBe("-1300.00");
    expect(summary.receivable).toBe("2000.00");
  });

  it("uses createdAt when a confirmed payment has no paidAt", () => {
    const { entries } = buildLedger({
      ...input,
      payments: [
        { paidAt: null, createdAt: "2026-09-20T10:00:00Z", amount: "100.00", status: "confirmado", clientName: "Dan" },
      ],
    });
    expect(entries[0].date).toBe("2026-09-20");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/finance/ledger` has no exports.

- [ ] **Step 3: Implement `domain/finance/ledger.ts`**

```ts
export type LedgerEntry = {
  date: string;
  kind: "recebimento" | "despesa";
  description: string;
  amount: string;
  signedAmount: string;
};

export type LedgerSummary = {
  received: string;
  expenses: string;
  net: string;
  receivable: string;
};

function toCents(value: string): number {
  const negative = value.startsWith("-");
  const [whole, fraction = "0"] = value.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2));
  return negative ? -cents : cents;
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function buildLedger(input: {
  payments: {
    paidAt: string | null;
    createdAt: string;
    amount: string;
    status: string;
    clientName: string;
  }[];
  expenses: { date: string; category: string | null; type: string; amount: string }[];
  openReceivable: string;
}): { entries: LedgerEntry[]; summary: LedgerSummary } {
  const receipts: LedgerEntry[] = input.payments
    .filter((p) => p.status === "confirmado")
    .map((p) => ({
      date: (p.paidAt ?? p.createdAt).slice(0, 10),
      kind: "recebimento" as const,
      description: `Recebimento — ${p.clientName}`,
      amount: p.amount,
      signedAmount: p.amount,
    }));

  const outflows: LedgerEntry[] = input.expenses.map((e) => ({
    date: e.date.slice(0, 10),
    kind: "despesa" as const,
    description: `${e.category ?? "Despesa"} (${e.type})`,
    amount: e.amount,
    signedAmount: fromCents(-toCents(e.amount)),
  }));

  const entries = [...receipts, ...outflows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const receivedCents = receipts.reduce((s, e) => s + toCents(e.amount), 0);
  const expensesCents = outflows.reduce((s, e) => s + toCents(e.amount), 0);

  return {
    entries,
    summary: {
      received: fromCents(receivedCents),
      expenses: fromCents(expensesCents),
      net: fromCents(receivedCents - expensesCents),
      receivable: input.openReceivable,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Implement `domain/finance/queries.ts`**

```ts
import { and, gte, lte, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { payments, expenses, shoots, clients } from "@/db/schema";
import { calculateBalance } from "@/domain/payments/balance";
import { buildLedger, type LedgerEntry, type LedgerSummary } from "./ledger";

export async function getFinancialLedger(range: { from: string; to: string }): Promise<{
  entries: LedgerEntry[];
  summary: LedgerSummary;
}> {
  const paymentRows = await db
    .select({
      paidAt: sql<string | null>`${payments.paidAt}::text`,
      createdAt: sql<string>`${payments.createdAt}::text`,
      amount: payments.amount,
      status: payments.status,
      clientName: clients.name,
    })
    .from(payments)
    .innerJoin(shoots, eq(payments.shootId, shoots.id))
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .where(
      and(
        gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, range.from),
        lte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, `${range.to}T23:59:59Z`),
      ),
    );

  const expenseRows = await db
    .select({ date: expenses.date, category: expenses.category, type: expenses.type, amount: expenses.amount })
    .from(expenses)
    .where(and(gte(expenses.date, range.from), lte(expenses.date, range.to)));

  // Open receivable across ALL shoots (not period-limited): agreed price minus
  // confirmed payments, summed over positive per-shoot balances.
  const allShoots = await db.select({ id: shoots.id, agreedPrice: shoots.agreedPrice }).from(shoots);
  const shootIds = allShoots.map((s) => s.id);
  const allConfirmed = shootIds.length
    ? await db
        .select({ shootId: payments.shootId, amount: payments.amount, status: payments.status })
        .from(payments)
        .where(inArray(payments.shootId, shootIds))
    : [];
  const paymentsByShoot = new Map<string, { amount: string; status: "pendente" | "confirmado" | "estornado" }[]>();
  for (const p of allConfirmed) {
    const list = paymentsByShoot.get(p.shootId) ?? [];
    list.push({ amount: p.amount, status: p.status });
    paymentsByShoot.set(p.shootId, list);
  }
  let openReceivableCents = 0;
  for (const s of allShoots) {
    const bal = calculateBalance(s.agreedPrice, paymentsByShoot.get(s.id) ?? []);
    if (!bal.startsWith("-") && bal !== "0.00") {
      const [w, f = "0"] = bal.split(".");
      openReceivableCents += Number(w) * 100 + Number(`${f}00`.slice(0, 2));
    }
  }
  const openReceivable = `${Math.floor(openReceivableCents / 100)}.${String(openReceivableCents % 100).padStart(2, "0")}`;

  return buildLedger({ payments: paymentRows, expenses: expenseRows, openReceivable });
}
```

- [ ] **Step 6: Period picker component**

Create `components/admin/period-picker.tsx`:

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PeriodPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: "from" | "to", value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 font-sans text-sm">
      <label className="text-muted">De</label>
      <input
        type="date"
        value={params.get("from") ?? ""}
        onChange={(e) => set("from", e.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
      />
      <label className="text-muted">até</label>
      <input
        type="date"
        value={params.get("to") ?? ""}
        onChange={(e) => set("to", e.target.value)}
        className="border border-line bg-white px-3 py-2 text-ink"
      />
    </div>
  );
}
```

- [ ] **Step 7: Financial page**

Create `app/admin/(protected)/financeiro/page.tsx`:

```tsx
import Link from "next/link";
import { getFinancialLedger } from "@/domain/finance/queries";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/admin/kpi-tile";
import { PeriodPicker } from "@/components/admin/period-picker";
import { formatBRL, formatShootDate } from "@/lib/format";
import type { LedgerEntry } from "@/domain/finance/ledger";

type SearchParams = Promise<{ from?: string; to?: string }>;

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const columns: Column<LedgerEntry>[] = [
  { key: "date", header: "Data", render: (e) => formatShootDate(e.date) },
  { key: "kind", header: "Tipo", render: (e) => (e.kind === "recebimento" ? "Recebimento" : "Despesa") },
  { key: "description", header: "Descrição", render: (e) => e.description },
  {
    key: "amount",
    header: "Valor",
    className: "text-right",
    render: (e) => (
      <span className={e.signedAmount.startsWith("-") ? "text-danger" : "text-[#1e7d4f]"}>
        {formatBRL(e.signedAmount)}
      </span>
    ),
  },
];

export default async function FinanceiroPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const fallback = defaultRange();
  const range = {
    from: sp.from && ISO.test(sp.from) ? sp.from : fallback.from,
    to: sp.to && ISO.test(sp.to) ? sp.to : fallback.to,
  };
  const { entries, summary } = await getFinancialLedger(range);

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Livro de recebimentos e despesas. Todos os valores derivam dos registros normalizados."
        action={
          <Link
            href="/admin/financeiro/despesas"
            className="border border-line px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:border-ink"
          >
            Despesas
          </Link>
        }
      />

      <div className="mb-6"><PeriodPicker /></div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Recebido" value={formatBRL(summary.received)} />
        <KpiTile label="Despesas" value={formatBRL(summary.expenses)} />
        <KpiTile label="Resultado" value={formatBRL(summary.net)} />
        <KpiTile label="A receber (total)" value={formatBRL(summary.receivable)} />
      </div>

      <DataTable
        columns={columns}
        rows={entries}
        rowKey={(e) => e.id}
        empty={<EmptyState title="Sem lançamentos" description="Nenhum recebimento ou despesa no período." />}
      />
    </div>
  );
}
```

> `LedgerEntry` needs a stable `id` for `rowKey` (two entries can share a date+description). Add `id: string` to the `LedgerEntry` type in Step 3 and set it when building the arrays: `id: \`receipt-${i}\`` / `id: \`expense-${i}\`` using the `.map((e, i) => ...)` index, assigned **before** the `.sort()`. Update `tests/domain/finance-ledger.test.ts` to assert `entries.every((e) => e.id)` if you want it covered.

- [ ] **Step 8: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green.

- [ ] **Step 9: Commit**

```powershell
git add domain/finance/ app/admin/(protected)/financeiro/page.tsx components/admin/period-picker.tsx tests/domain/finance-ledger.test.ts
git commit -m "$(cat <<'EOF'
SCL-221: financial ledger and dashboard, fully derived

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-221, `DONE`. Note: ledger + KPIs recomputed from `payments`/`expenses`/`shoots` on every render (PRD §7.5, §16 "dashboard recalcula indicadores"); `buildLedger` pure/tested; "a receber" derived via `calculateBalance` over all shoots; the spreadsheet dashboard is not migrated as data (PRD §13). Commit: `SCL-221: mark task DONE in docs/TASKS.md`.

---

### Task 11: SCL-222 — Expenses

**Files:**
- Create: `domain/finance/expense-queries.ts`
- Test: `tests/domain/expense-form-schema.test.ts`
- Create: `domain/finance/expense-form-schema.ts`
- Create: `domain/finance/expense-actions.ts`
- Create: `app/admin/(protected)/financeiro/despesas/page.tsx`
- Create: `app/admin/(protected)/financeiro/despesas/expense-form.tsx`

**Interfaces:**
- Consumes: `db`; `expenses` (`db/schema`); `createExpenseSchema` (`domain/payments/schema.ts`); `createExpense` (`domain/payments/service.ts`); `expenseTypeValues` (`domain/payments/schema.ts`); `recordAuditEvent`; `defineAdminAction`, `toFormAction`; `DataTable`, `Card`, `PageHeader`, `Modal`.
- Produces:
  - `type ExpenseListRow = { id: string; date: string; type: string; category: string | null; amount: string; method: string | null; recurring: boolean }`
  - `listExpenses(range: { from: string; to: string }): Promise<ExpenseListRow[]>`
  - `expenseFormSchema` — `createExpenseSchema` with `z.coerce.boolean()` for `recurring`
  - `createExpenseAction: (raw: unknown) => Promise<ActionResult<{ id: string }>>`

- [ ] **Step 1: Write the failing test for `expenseFormSchema`**

Create `tests/domain/expense-form-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { expenseFormSchema } from "@/domain/finance/expense-form-schema";

describe("expenseFormSchema", () => {
  const base = { date: "2026-09-10", type: "custo", amount: "900.00" };

  it("accepts a minimal expense and defaults recurring to false", () => {
    const r = expenseFormSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.recurring).toBe(false);
  });

  it("accepts a normalized boolean recurring", () => {
    const r = expenseFormSchema.safeParse({ ...base, recurring: true });
    expect(r.success && r.data.recurring).toBe(true);
  });

  it("rejects an unknown expense type", () => {
    expect(expenseFormSchema.safeParse({ ...base, type: "aleatorio" }).success).toBe(false);
  });

  it("rejects a malformed amount and a malformed date", () => {
    expect(expenseFormSchema.safeParse({ ...base, amount: "9,00" }).success).toBe(false);
    expect(expenseFormSchema.safeParse({ ...base, date: "10/09/2026" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/finance/expense-form-schema` has no exports.

- [ ] **Step 3: Implement `expense-form-schema.ts`**

```ts
import { z } from "zod";
import { createExpenseSchema } from "@/domain/payments/schema";

export const expenseFormSchema = createExpenseSchema.extend({
  recurring: z.coerce.boolean().default(false),
});

export type ExpenseFormValues = z.input<typeof expenseFormSchema>;
```

> `createExpenseSchema.date` is already `z.iso.date()` and `type` is already `z.enum(expenseTypeValues)` (Epic 1, `domain/payments/schema.ts` — verified), so the "rejects 10/09/2026" and "rejects unknown type" cases pass with no override. The only extension needed is `recurring: z.coerce.boolean().default(false)` so a checkbox value survives. Do not edit `domain/payments/schema.ts` (Epic 1, frozen).

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Queries + action**

Create `domain/finance/expense-queries.ts`:

```ts
import { and, gte, lte, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { expenses } from "@/db/schema";

export type ExpenseListRow = {
  id: string;
  date: string;
  type: string;
  category: string | null;
  amount: string;
  method: string | null;
  recurring: boolean;
};

export async function listExpenses(range: { from: string; to: string }): Promise<ExpenseListRow[]> {
  return db
    .select({
      id: expenses.id,
      date: expenses.date,
      type: expenses.type,
      category: expenses.category,
      amount: expenses.amount,
      method: expenses.method,
      recurring: expenses.recurring,
    })
    .from(expenses)
    .where(and(gte(expenses.date, range.from), lte(expenses.date, range.to)))
    .orderBy(desc(expenses.date));
}
```

Create `domain/finance/expense-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { createExpense } from "@/domain/payments/service";
import { recordAuditEvent } from "@/domain/audit/service";
import { expenseFormSchema } from "./expense-form-schema";

export const createExpenseAction = defineAdminAction(
  { role: "staff", input: expenseFormSchema },
  async (input, ctx) => {
    const created = await createExpense(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "expense.created",
      entityType: "expense",
      entityId: created.id,
      before: null,
      after: created,
    });
    revalidatePath("/admin/financeiro/despesas");
    revalidatePath("/admin/financeiro");
    revalidatePath("/admin");
    return { id: created.id };
  },
);
```

- [ ] **Step 6: Expenses page + form**

Create `app/admin/(protected)/financeiro/despesas/page.tsx`:

```tsx
import { listExpenses } from "@/domain/finance/expense-queries";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { ExpenseForm } from "./expense-form";
import { formatBRL, formatShootDate } from "@/lib/format";
import type { ExpenseListRow } from "@/domain/finance/expense-queries";

type SearchParams = Promise<{ from?: string; to?: string }>;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10),
  };
}

const columns: Column<ExpenseListRow>[] = [
  { key: "date", header: "Data", render: (e) => formatShootDate(e.date) },
  { key: "type", header: "Tipo", render: (e) => e.type },
  { key: "category", header: "Categoria", render: (e) => e.category ?? "—" },
  { key: "method", header: "Forma", render: (e) => e.method ?? "—" },
  { key: "recurring", header: "Recorrente", render: (e) => (e.recurring ? "Sim" : "Não") },
  { key: "amount", header: "Valor", className: "text-right", render: (e) => formatBRL(e.amount) },
];

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const fallback = defaultRange();
  const range = {
    from: sp.from && ISO.test(sp.from) ? sp.from : fallback.from,
    to: sp.to && ISO.test(sp.to) ? sp.to : fallback.to,
  };
  const rows = await listExpenses(range);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Despesas" description="Saídas independentes de um ensaio (PRD §7.5)." />
      <Card>
        <h2 className="mb-4 font-serif text-lg font-light text-ink">Nova despesa</h2>
        <ExpenseForm />
      </Card>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        empty={<EmptyState title="Sem despesas" description="Nenhuma despesa no período." />}
      />
    </div>
  );
}
```

Create `app/admin/(protected)/financeiro/despesas/expense-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction } from "@/domain/finance/expense-actions";
import { toFormAction, type ActionResult } from "@/lib/auth/admin-action";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

export function ExpenseForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, fd: FormData) => {
      const result = await toFormAction(createExpenseAction, { booleans: ["recurring"] })(prev, fd);
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <FormStatus state={state} />
      {state && state.ok ? <p className="font-sans text-sm text-[#1e7d4f]">Despesa registrada.</p> : null}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data" htmlFor="date" error={err("date")}>
          <Input id="date" name="date" type="date" required />
        </Field>
        <Field label="Tipo" htmlFor="type" error={err("type")}>
          <Select id="type" name="type" defaultValue="custo">
            <option value="custo">Custo</option>
            <option value="investimento">Investimento</option>
            <option value="funcionario">Funcionário</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoria" htmlFor="category" error={err("category")}>
          <Input id="category" name="category" />
        </Field>
        <Field label="Valor" htmlFor="amount" hint="Ex.: 900.00" error={err("amount")}>
          <Input id="amount" name="amount" inputMode="decimal" required />
        </Field>
      </div>
      <Field label="Forma de pagamento" htmlFor="method" error={err("method")}>
        <Input id="method" name="method" />
      </Field>
      <Field label="Comprovante (URL)" htmlFor="proofUrl" error={err("proofUrl")}>
        <Input id="proofUrl" name="proofUrl" type="url" />
      </Field>
      <Field label="Observações" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" />
      </Field>
      <label className="flex items-center gap-2 font-sans text-sm text-ink">
        <input type="checkbox" name="recurring" />
        Despesa recorrente
      </label>
      <div>
        <SubmitButton>Registrar despesa</SubmitButton>
      </div>
    </form>
  );
}
```

- [ ] **Step 7: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green.

- [ ] **Step 8: Commit**

```powershell
git add domain/finance/ app/admin/(protected)/financeiro/despesas/ tests/domain/expense-form-schema.test.ts
git commit -m "$(cat <<'EOF'
SCL-222: expenses list and wrapped create action

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-222, `DONE`. Note: `expenses` has no FK to a shoot by design (PRD §7.5); `createExpenseAction` through the wrapper + audit; the form schema overrides `date`/`recurring` without touching the frozen Epic 1 schema. Commit: `SCL-222: mark task DONE in docs/TASKS.md`.

---

### Task 12: SCL-230 — Production Kanban

**Files:**
- Create: `domain/production/queries.ts`
- Test: `tests/domain/production-board.test.ts`
- Create: `app/admin/(protected)/producao/page.tsx`
- Create: `components/admin/kanban-column.tsx`
- Create: `components/admin/production-card.tsx`

**Interfaces:**
- Consumes: `db`; `productionJobs`, `shoots`, `clients`, `experiencePackages`, `profiles` (`db/schema`); `productionJobStatusEnum` (`db/schema`); `Badge`, `PageHeader`; `formatShootDate`.
- Produces:
  - `type ProductionCard = { jobId: string; shootId: string; clientName: string; packageName: string; shootDate: string; status: string; editorName: string | null; deliveryDueAt: string | null; photosToEdit: number | null }`
  - `type ProductionBoard = { column: string; cards: ProductionCard[] }[]`
  - `groupJobsByStatus(jobs: ProductionCard[]): ProductionBoard` — pure, tested; always returns all 5 columns in canonical order, empty ones included
  - `getProductionBoard(): Promise<ProductionBoard>`

- [ ] **Step 1: Write the failing test for `groupJobsByStatus`**

Create `tests/domain/production-board.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupJobsByStatus, type ProductionCard } from "@/domain/production/queries";

const card = (id: string, status: string): ProductionCard => ({
  jobId: id,
  shootId: `s-${id}`,
  clientName: "Cliente",
  packageName: "Aurora",
  shootDate: "2026-10-01",
  status,
  editorName: null,
  deliveryDueAt: null,
  photosToEdit: null,
});

describe("groupJobsByStatus", () => {
  it("returns all five columns in canonical order even when empty", () => {
    const board = groupJobsByStatus([]);
    expect(board.map((c) => c.column)).toEqual(["aguardando", "iniciado", "parcial", "finalizado", "entregue"]);
    expect(board.every((c) => c.cards.length === 0)).toBe(true);
  });

  it("places each job in its status column", () => {
    const board = groupJobsByStatus([card("1", "aguardando"), card("2", "finalizado"), card("3", "finalizado")]);
    expect(board.find((c) => c.column === "aguardando")?.cards).toHaveLength(1);
    expect(board.find((c) => c.column === "finalizado")?.cards).toHaveLength(2);
  });

  it("ignores a card with an unknown status rather than throwing", () => {
    const board = groupJobsByStatus([card("1", "bogus")]);
    expect(board.reduce((n, c) => n + c.cards.length, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/production/queries` has no exports.

- [ ] **Step 3: Implement `domain/production/queries.ts`**

```ts
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { productionJobs, shoots, clients, experiencePackages, profiles } from "@/db/schema";
import { productionJobStatusEnum } from "@/db/schema";

export type ProductionCard = {
  jobId: string;
  shootId: string;
  clientName: string;
  packageName: string;
  shootDate: string;
  status: string;
  editorName: string | null;
  deliveryDueAt: string | null;
  photosToEdit: number | null;
};

export type ProductionBoard = { column: string; cards: ProductionCard[] }[];

const COLUMNS = productionJobStatusEnum.enumValues; // ["aguardando","iniciado","parcial","finalizado","entregue"]

export function groupJobsByStatus(jobs: ProductionCard[]): ProductionBoard {
  return COLUMNS.map((column) => ({
    column,
    cards: jobs.filter((j) => j.status === column),
  }));
}

export async function getProductionBoard(): Promise<ProductionBoard> {
  const rows = await db
    .select({
      jobId: productionJobs.id,
      shootId: productionJobs.shootId,
      clientName: clients.name,
      packageName: experiencePackages.name,
      shootDate: shoots.shootDate,
      status: productionJobs.status,
      editorName: profiles.fullName,
      deliveryDueAt: productionJobs.deliveryDueAt,
      photosToEdit: productionJobs.photosToEdit,
    })
    .from(productionJobs)
    .innerJoin(shoots, eq(productionJobs.shootId, shoots.id))
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .leftJoin(profiles, eq(productionJobs.editorUserId, profiles.id));

  return groupJobsByStatus(rows);
}
```

> Confirm the `profiles` display-name column name — `db/schema/profiles.ts`. The Epic 1 notes reference `profiles.full_name` (`fullName`). If it differs, use the real one; if `profiles` has no name column, select `profiles.id` and render a shortened id, and note the gap for a future task (do **not** add a migration here).

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Kanban components**

Create `components/admin/production-card.tsx`:

```tsx
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatShootDate } from "@/lib/format";
import type { ProductionCard as CardData } from "@/domain/production/queries";
import { ProductionStatusControl } from "@/app/admin/(protected)/producao/production-status-control";

export function ProductionCardView({ card }: { card: CardData }) {
  return (
    <Card className="p-4">
      <Link href={`/admin/agenda/${card.shootId}`} className="font-serif text-base text-ink underline-offset-2 hover:underline">
        {card.clientName}
      </Link>
      <p className="mt-1 font-sans text-xs text-muted">{card.packageName} · {formatShootDate(card.shootDate)}</p>
      <dl className="mt-3 flex flex-col gap-1 font-sans text-xs text-muted">
        <div className="flex justify-between"><dt>Editor</dt><dd className="text-ink">{card.editorName ?? "—"}</dd></div>
        <div className="flex justify-between"><dt>Fotos</dt><dd className="text-ink">{card.photosToEdit ?? "—"}</dd></div>
        <div className="flex justify-between"><dt>Prazo</dt><dd className="text-ink">{card.deliveryDueAt ? formatShootDate(card.deliveryDueAt) : "—"}</dd></div>
      </dl>
      <div className="mt-3 border-t border-line pt-3">
        <ProductionStatusControl jobId={card.jobId} status={card.status} />
      </div>
    </Card>
  );
}
```

Create `components/admin/kanban-column.tsx`:

```tsx
import type { ReactNode } from "react";

export function KanbanColumn({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <h2 className="font-sans text-[11px] uppercase tracking-[0.16em] text-muted">{title}</h2>
        <span className="font-sans text-xs text-muted">{count}</span>
      </div>
      {children}
    </div>
  );
}
```

> `ProductionStatusControl` is delivered by **Task 13 (SCL-231)**. Until Task 13 lands, this task's page cannot compile. Options: (a) do Task 12 and Task 13 as one commit sequence — recommended, they are two halves of one board; or (b) in Task 12, ship `production-status-control.tsx` as a read-only `<Badge>{status}</Badge>` and have Task 13 replace it. This plan takes option (a): Task 13's steps are written to run immediately after Task 12's Step 6 without an intervening commit. If you prefer separate commits, add the placeholder in Step 6 and note it.

- [ ] **Step 6: Kanban page**

Create `app/admin/(protected)/producao/page.tsx`:

```tsx
import { getProductionBoard } from "@/domain/production/queries";
import { PageHeader } from "@/components/ui/page-header";
import { KanbanColumn } from "@/components/admin/kanban-column";
import { ProductionCardView } from "@/components/admin/production-card";

const LABELS: Record<string, string> = {
  aguardando: "Aguardando",
  iniciado: "Iniciado",
  parcial: "Parcial",
  finalizado: "Finalizado",
  entregue: "Entregue",
};

export default async function ProducaoPage() {
  const board = await getProductionBoard();

  return (
    <div>
      <PageHeader title="Produção & Edição" description="Um job por ensaio. Arraste o status pelo controle de cada card." />
      <div className="flex gap-6 overflow-x-auto pb-4">
        {board.map((col) => (
          <KanbanColumn key={col.column} title={LABELS[col.column] ?? col.column} count={col.cards.length}>
            {col.cards.length === 0 ? (
              <p className="font-sans text-xs text-muted">—</p>
            ) : (
              col.cards.map((card) => <ProductionCardView key={card.jobId} card={card} />)
            )}
          </KanbanColumn>
        ))}
      </div>
    </div>
  );
}
```

Proceed directly to Task 13 (do not run the full verification suite yet — the page won't compile until `ProductionStatusControl` exists).

- [ ] **Step 7: (after Task 13) Commit both**

See Task 13, Step 6.

- [ ] **Step 8: Update `docs/TASKS.md`**

Done jointly with Task 13.

---

### Task 13: SCL-231 — Change ProductionJob status (+ editor / delivery fields)

**Files:**
- Modify: `domain/production/service.ts` (add `changeProductionJobStatus`, `updateProductionJobFields`)
- Test: `tests/domain/change-production-status.test.ts` (guarded live-DB) + reuse existing `tests/domain/production-status.test.ts`
- Create: `domain/production/actions.ts`
- Create: `app/admin/(protected)/producao/production-status-control.tsx`

**Interfaces:**
- Consumes: `db`; `productionJobs`, `shoots` (`db/schema`); `canTransitionProductionStatus`, `type ProductionJobStatus` (`domain/production/status.ts`); `productionJobStatusEnum`; `canTransitionShootStatus` (`domain/shoots/status.ts`) — for the `finalizado`/`entregue` reflection onto the shoot; `recordAuditEvent`; `defineAdminAction`.
- Produces:
  - `changeProductionJobStatus(jobId: string, to: ProductionJobStatus): Promise<{ job: ProductionJob; shootStatusChanged: string | null }>` — validates the transition with `canTransitionProductionStatus`; in one `db.transaction` writes the job status and, when `to === "finalizado"` reflects the shoot to `finalizado` (if `canTransitionShootStatus` allows) and when `to === "entregue"` reflects the shoot to `entregue`. Throws `Error("transição inválida")` on a disallowed job transition.
  - `updateProductionJobFields(jobId: string, fields: { editorUserId?: string | null; photosToEdit?: number | null; deliveryDueAt?: string | null; deliveryAt?: string | null; selectionStatus?: string | null; notes?: string | null }): Promise<ProductionJob>`
  - `changeProductionStatusAction: (raw: unknown) => Promise<ActionResult<{ jobId: string }>>`
  - `updateProductionJobAction: (raw: unknown) => Promise<ActionResult<{ jobId: string }>>`
  - `<ProductionStatusControl jobId status />` — client component: a `<select>` of the statuses `canTransitionProductionStatus(status, x)` allows, submitting through `changeProductionStatusAction`

- [ ] **Step 1: Write the failing test**

Create `tests/domain/change-production-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canTransitionProductionStatus } from "@/domain/production/status";

// Pure-rule coverage lives in tests/domain/production-status.test.ts already.
// This file adds the "which options does the UI offer" helper contract.
import { allowedProductionTransitions } from "@/domain/production/status";

describe("allowedProductionTransitions", () => {
  it("from aguardando offers only iniciado", () => {
    expect(allowedProductionTransitions("aguardando")).toEqual(["iniciado"]);
  });

  it("from iniciado offers parcial and finalizado (skip allowed)", () => {
    expect(allowedProductionTransitions("iniciado").sort()).toEqual(["finalizado", "parcial"]);
  });

  it("from entregue offers nothing (terminal)", () => {
    expect(allowedProductionTransitions("entregue")).toEqual([]);
  });

  it("every offered transition passes canTransitionProductionStatus", () => {
    for (const from of ["aguardando", "iniciado", "parcial", "finalizado", "entregue"] as const) {
      for (const to of allowedProductionTransitions(from)) {
        expect(canTransitionProductionStatus(from, to)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `allowedProductionTransitions` is not exported from `@/domain/production/status`.

- [ ] **Step 3: Add `allowedProductionTransitions` to `domain/production/status.ts`**

Append (do not modify the existing function):

```ts
// UI helper: the set of statuses the operator may move a job to right now. Derived
// from canTransitionProductionStatus so the dropdown and the guard can never drift.
export function allowedProductionTransitions(from: ProductionJobStatus): ProductionJobStatus[] {
  return ORDER.filter((to) => canTransitionProductionStatus(from, to));
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Service + action + control**

Append to `domain/production/service.ts`:

```ts
import { shoots } from "@/db/schema";
import { canTransitionProductionStatus, type ProductionJobStatus } from "./status";
import { canTransitionShootStatus } from "@/domain/shoots/status";

export async function changeProductionJobStatus(
  jobId: string,
  to: ProductionJobStatus,
): Promise<{ job: ProductionJob; shootStatusChanged: string | null }> {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(productionJobs).where(eq(productionJobs.id, jobId)).limit(1);
    if (!current) throw new Error("job inexistente");
    if (!canTransitionProductionStatus(current.status, to)) throw new Error("transição inválida");

    const [job] = await tx
      .update(productionJobs)
      .set({ status: to, ...(to === "entregue" ? { deliveryAt: new Date().toISOString().slice(0, 10) } : {}) })
      .where(eq(productionJobs.id, jobId))
      .returning();

    let shootStatusChanged: string | null = null;
    const reflect =
      to === "finalizado" ? "finalizado" : to === "entregue" ? "entregue" : null;
    if (reflect) {
      const [shoot] = await tx.select().from(shoots).where(eq(shoots.id, job.shootId)).limit(1);
      if (shoot && shoot.status !== reflect && canTransitionShootStatus(shoot.status, reflect as never)) {
        await tx.update(shoots).set({ status: reflect as never }).where(eq(shoots.id, job.shootId));
        shootStatusChanged = reflect;
      }
    }
    return { job, shootStatusChanged };
  });
}

export async function updateProductionJobFields(
  jobId: string,
  fields: {
    editorUserId?: string | null;
    photosToEdit?: number | null;
    deliveryDueAt?: string | null;
    deliveryAt?: string | null;
    selectionStatus?: string | null;
    notes?: string | null;
  },
): Promise<ProductionJob> {
  const [row] = await db.update(productionJobs).set(fields).where(eq(productionJobs.id, jobId)).returning();
  return row;
}
```

Create `domain/production/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { productionJobStatusEnum } from "@/db/schema";
import { changeProductionJobStatus, updateProductionJobFields } from "./service";
import { getProductionJobByShootId } from "./service";
import { recordAuditEvent } from "@/domain/audit/service";

export const changeProductionStatusAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({
      jobId: z.string().uuid(),
      to: z.enum(productionJobStatusEnum.enumValues),
    }),
  },
  async (input, ctx) => {
    const { job, shootStatusChanged } = await changeProductionJobStatus(input.jobId, input.to);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "production_job.status_changed",
      entityType: "production_job",
      entityId: job.id,
      before: null,
      after: { status: job.status, shootStatusChanged },
    });
    revalidatePath("/admin/producao");
    revalidatePath(`/admin/agenda/${job.shootId}`);
    revalidatePath("/admin");
    return { jobId: job.id };
  },
);

export const updateProductionJobAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({
      jobId: z.string().uuid(),
      editorUserId: z.string().uuid().nullable().optional(),
      photosToEdit: z.coerce.number().int().positive().nullable().optional(),
      deliveryDueAt: z.iso.date().nullable().optional(),
      selectionStatus: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
  },
  async (input, ctx) => {
    const { jobId, ...fields } = input;
    const job = await updateProductionJobFields(jobId, fields);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "production_job.updated",
      entityType: "production_job",
      entityId: jobId,
      before: null,
      after: job,
    });
    revalidatePath("/admin/producao");
    revalidatePath(`/admin/agenda/${job.shootId}`);
    return { jobId };
  },
);
```

Create `app/admin/(protected)/producao/production-status-control.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeProductionStatusAction } from "@/domain/production/actions";
import { allowedProductionTransitions, type ProductionJobStatus } from "@/domain/production/status";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  aguardando: "Aguardando",
  iniciado: "Iniciado",
  parcial: "Parcial",
  finalizado: "Finalizado",
  entregue: "Entregue",
};

export function ProductionStatusControl({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const options = allowedProductionTransitions(status as ProductionJobStatus);

  function move(to: string) {
    startTransition(async () => {
      const result = await changeProductionStatusAction({ jobId, to });
      if (result.ok) router.refresh();
      else alert(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Badge tone="active">{LABELS[status] ?? status}</Badge>
      {options.length > 0 ? (
        <select
          disabled={pending}
          defaultValue=""
          onChange={(e) => e.target.value && move(e.target.value)}
          className="border border-line bg-white px-2 py-1 font-sans text-xs text-ink disabled:opacity-50"
        >
          <option value="">Mover para…</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {LABELS[o]}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Full verification suite (Tasks 12 + 13 together) and commit**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green. Then once with `RUN_LIVE_DB_TESTS=true` against dev/staging (no live-DB test file was added for this task, but the E2E `create-confirmed-shoot` + `register-payment` suites must still pass).

```powershell
git add domain/production/ "app/admin/(protected)/producao/" components/admin/kanban-column.tsx components/admin/production-card.tsx tests/domain/production-board.test.ts tests/domain/change-production-status.test.ts
git commit -m "$(cat <<'EOF'
SCL-230/SCL-231: production Kanban with guarded status transitions

Board groups jobs by status (all five columns always shown). Status changes
validate via canTransitionProductionStatus and reflect finalizado/entregue onto
the shoot inside one transaction; every change is audited.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: Update `docs/TASKS.md`**

Move SCL-230 and SCL-231 to `DONE` with detailed sections. Record: board is all-five-columns-always (`groupJobsByStatus` pure/tested); transitions guarded by the Epic 1 `canTransitionProductionStatus` (incl. the deliberate `iniciado→finalizado` skip); `finalizado` reflects onto the shoot (PRD §7.6 "Finalizado sinaliza Reveal") and `entregue` too (PRD §7.6 "Entregue sinaliza pós-venda"), only when `canTransitionShootStatus` allows, in the same transaction; `allowedProductionTransitions` keeps the dropdown and the guard in sync; every change audited. Commit: `SCL-230: mark tasks DONE in docs/TASKS.md`.

---

### Task 14: SCL-240 — Internal preparation checklist

**Files:**
- Modify: `domain/preparation/service.ts` (add `setPreparationTaskStatus`, `addPreparationTask`, `getPreparationTasksByShootId` already exists)
- Modify: `domain/preparation/schema.ts` (add `addPreparationTaskFormSchema`)
- Test: `tests/domain/preparation-progress.test.ts` (pure `summarizePreparationProgress`)
- Create: `domain/preparation/queries.ts` (`summarizePreparationProgress`)
- Create: `domain/preparation/actions.ts`
- Create: `app/admin/(protected)/agenda/[id]/preparacao/page.tsx`
- Create: `app/admin/(protected)/agenda/[id]/preparacao/checklist.tsx`

**Interfaces:**
- Consumes: `db`; `preparationTasks`, `shoots` (`db/schema`); `preparationTaskStatusEnum`; `createPreparationTaskSchema` (`domain/preparation/schema.ts`); `getPreparationTasksByShootId` (`domain/preparation/service.ts`); `recordAuditEvent`; `defineAdminAction`, `toFormAction`.
- Produces:
  - `type PreparationProgress = { total: number; done: number; pct: number; nextTaskTitle: string | null }`
  - `summarizePreparationProgress(tasks: { status: string; title: string; visibleToClient: boolean }[]): PreparationProgress` — pure, tested; `pct` is `0..100` integer; `nextTaskTitle` = first non-`concluida` task's title or `null`
  - `setPreparationTaskStatus(taskId: string, status: "pendente" | "em_andamento" | "concluida"): Promise<PreparationTask>` — sets `completedAt` when moving to `concluida`, clears it otherwise
  - `addPreparationTask(input: CreatePreparationTaskInput): Promise<PreparationTask>` (thin wrapper over `createPreparationTask`, kept for a symmetrical action surface)
  - `addPreparationTaskFormSchema` — `createPreparationTaskSchema` with `z.coerce.boolean()` for `visibleToClient`
  - `addPreparationTaskAction`, `setPreparationTaskStatusAction`

- [ ] **Step 1: Write the failing test for `summarizePreparationProgress`**

Create `tests/domain/preparation-progress.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { summarizePreparationProgress } from "@/domain/preparation/queries";

const t = (status: string, title: string) => ({ status, title, visibleToClient: true });

describe("summarizePreparationProgress", () => {
  it("is 0% with no tasks and no next task", () => {
    expect(summarizePreparationProgress([])).toEqual({ total: 0, done: 0, pct: 0, nextTaskTitle: null });
  });

  it("counts concluida as done and rounds pct to an integer", () => {
    const p = summarizePreparationProgress([
      t("concluida", "A"),
      t("pendente", "B"),
      t("em_andamento", "C"),
    ]);
    expect(p).toMatchObject({ total: 3, done: 1, pct: 33 });
  });

  it("nextTaskTitle is the first non-concluida task in order", () => {
    const p = summarizePreparationProgress([t("concluida", "A"), t("em_andamento", "B"), t("pendente", "C")]);
    expect(p.nextTaskTitle).toBe("B");
  });

  it("is 100% and null next when every task is concluida", () => {
    const p = summarizePreparationProgress([t("concluida", "A"), t("concluida", "B")]);
    expect(p).toEqual({ total: 2, done: 2, pct: 100, nextTaskTitle: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/preparation/queries` has no exports.

- [ ] **Step 3: Implement `domain/preparation/queries.ts`**

```ts
export type PreparationProgress = {
  total: number;
  done: number;
  pct: number;
  nextTaskTitle: string | null;
};

export function summarizePreparationProgress(
  tasks: { status: string; title: string; visibleToClient: boolean }[],
): PreparationProgress {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "concluida").length;
  const next = tasks.find((t) => t.status !== "concluida");
  return {
    total,
    done,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    nextTaskTitle: next?.title ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Service + schema additions**

Append to `domain/preparation/service.ts`:

```ts
import { preparationTaskStatusEnum } from "@/db/schema";

type PrepStatus = (typeof preparationTaskStatusEnum.enumValues)[number];

export async function setPreparationTaskStatus(
  taskId: string,
  status: PrepStatus,
): Promise<PreparationTask> {
  const [row] = await db
    .update(preparationTasks)
    .set({
      status,
      completedAt: status === "concluida" ? new Date().toISOString() : null,
    })
    .where(eq(preparationTasks.id, taskId))
    .returning();
  return row;
}

export async function addPreparationTask(
  input: CreatePreparationTaskInput,
): Promise<PreparationTask> {
  return createPreparationTask(input);
}
```

Append to `domain/preparation/schema.ts`:

```ts
export const addPreparationTaskFormSchema = createPreparationTaskSchema.extend({
  visibleToClient: z.coerce.boolean().default(true),
});
```

(`z` and `createPreparationTaskSchema` are already in that file.)

- [ ] **Step 6: Actions**

Create `domain/preparation/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { preparationTaskStatusEnum } from "@/db/schema";
import { addPreparationTask, setPreparationTaskStatus } from "./service";
import { addPreparationTaskFormSchema } from "./schema";
import { recordAuditEvent } from "@/domain/audit/service";

export const addPreparationTaskAction = defineAdminAction(
  { role: "staff", input: addPreparationTaskFormSchema },
  async (input, ctx) => {
    const created = await addPreparationTask(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "preparation_task.created",
      entityType: "preparation_task",
      entityId: created.id,
      before: null,
      after: created,
    });
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath(`/admin/agenda/${input.shootId}/preparacao`);
    return { id: created.id };
  },
);

export const setPreparationTaskStatusAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({
      taskId: z.string().uuid(),
      shootId: z.string().uuid(),
      status: z.enum(preparationTaskStatusEnum.enumValues),
    }),
  },
  async (input, ctx) => {
    const updated = await setPreparationTaskStatus(input.taskId, input.status);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "preparation_task.status_changed",
      entityType: "preparation_task",
      entityId: input.taskId,
      before: null,
      after: { status: updated.status },
    });
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath(`/admin/agenda/${input.shootId}/preparacao`);
    return { taskId: input.taskId };
  },
);
```

- [ ] **Step 7: Checklist page + client component**

Create `app/admin/(protected)/agenda/[id]/preparacao/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getShootById } from "@/domain/shoots/service";
import { getPreparationTasksByShootId } from "@/domain/preparation/service";
import { summarizePreparationProgress } from "@/domain/preparation/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Checklist } from "./checklist";

type Params = Promise<{ id: string }>;

export default async function PreparationPage({ params }: { params: Params }) {
  const { id } = await params;
  const shoot = await getShootById(id);
  if (!shoot) notFound();

  const tasks = await getPreparationTasksByShootId(id);
  const progress = summarizePreparationProgress(tasks);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Checklist de preparação"
        description={`${progress.done}/${progress.total} concluídas${progress.nextTaskTitle ? ` · próximo: ${progress.nextTaskTitle}` : ""}`}
      />
      <Card className="p-0">
        <div className="h-1 bg-champ">
          <div className="h-1 bg-ink" style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="p-6">
          <Checklist
            shootId={id}
            tasks={tasks.map((t) => ({
              id: t.id,
              type: t.type,
              title: t.title,
              status: t.status,
              visibleToClient: t.visibleToClient,
            }))}
          />
        </div>
      </Card>
    </div>
  );
}
```

Create `app/admin/(protected)/agenda/[id]/preparacao/checklist.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addPreparationTaskAction,
  setPreparationTaskStatusAction,
} from "@/domain/preparation/actions";
import { toFormAction, type ActionResult } from "@/lib/auth/admin-action";
import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FormStatus } from "@/components/admin/form-status";
import { SubmitButton } from "@/components/admin/submit-button";

type Task = { id: string; type: string; title: string; status: string; visibleToClient: boolean };

const NEXT: Record<string, string> = { pendente: "em_andamento", em_andamento: "concluida", concluida: "pendente" };
const LABEL: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída" };

export function Checklist({ shootId, tasks }: { shootId: string; tasks: Task[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function cycle(task: Task) {
    startTransition(async () => {
      const result = await setPreparationTaskStatusAction({
        taskId: task.id,
        shootId,
        status: NEXT[task.status],
      });
      if (result.ok) router.refresh();
      else alert(result.error);
    });
  }

  const [state, formAction] = useActionState(
    async (prev: ActionResult<{ id: string }> | null, fd: FormData) => {
      const result = await toFormAction(addPreparationTaskAction, { booleans: ["visibleToClient"] })(prev, fd);
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-line border border-line">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-sans text-sm text-ink">{task.title}</p>
              <p className="font-sans text-xs text-muted">
                {task.type}
                {task.visibleToClient ? " · visível para a cliente" : " · interno"}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => cycle(task)}
              className="disabled:opacity-50"
            >
              <Badge tone={task.status === "concluida" ? "success" : task.status === "em_andamento" ? "warning" : "neutral"}>
                {LABEL[task.status]}
              </Badge>
            </button>
          </li>
        ))}
        {tasks.length === 0 ? <li className="px-4 py-3 font-sans text-sm text-muted">Nenhuma tarefa.</li> : null}
      </ul>

      <form action={formAction} className="flex flex-col gap-3 border-t border-line pt-6">
        <FormStatus state={state} />
        <input type="hidden" name="shootId" value={shootId} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo" htmlFor="type" error={state && !state.ok ? state.fieldErrors?.type?.[0] : undefined}>
            <Input id="type" name="type" placeholder="figurino, make…" required />
          </Field>
          <Field label="Título" htmlFor="title" error={state && !state.ok ? state.fieldErrors?.title?.[0] : undefined}>
            <Input id="title" name="title" required />
          </Field>
        </div>
        <label className="flex items-center gap-2 font-sans text-sm text-ink">
          <input type="checkbox" name="visibleToClient" defaultChecked />
          Visível para a cliente
        </label>
        <div>
          <SubmitButton>Adicionar tarefa</SubmitButton>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 8: Full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all green.

- [ ] **Step 9: Commit**

```powershell
git add domain/preparation/ "app/admin/(protected)/agenda/[id]/preparacao/" tests/domain/preparation-progress.test.ts
git commit -m "$(cat <<'EOF'
SCL-240: internal preparation checklist with status cycling and progress

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10: Update `docs/TASKS.md`**

Add SCL-240 summary row + detailed section, `DONE`. Note: checklist is the same `preparation_tasks` rows the client portal (Epic 3) will read — one source of truth (PRD §6.2 / §7.4, §7 principle); `visible_to_client` toggled per task here; `summarizePreparationProgress` pure/tested; `completedAt` set/cleared by `setPreparationTaskStatus`; every mutation wrapped + audited. Commit: `SCL-240: mark task DONE in docs/TASKS.md`.

---

## Final branch review (after Task 14)

This mirrors the P0 and Epic 1 close-out. Run **after all 14 tasks are committed to `main`**.

- [ ] **Step 1: Full suite, twice**

```powershell
npm run test ; npm run typecheck ; npm run lint ; npm run check:admin-auth ; npm run build
$env:RUN_LIVE_DB_TESTS="true" ; npm run test ; Remove-Item Env:RUN_LIVE_DB_TESTS
```

Both green. The second run must exercise `create-confirmed-shoot` and `register-payment` integration blocks against a **dev/staging** Supabase project, with every synthetic row cleaned up (`afterAll`) — verify by querying `clients`/`shoots`/`payments` for `Teste Epic2 %` names afterward and confirming zero rows.

- [ ] **Step 2: Auth-boundary audit**

Enumerate every file under `app/admin/(protected)/**` and `domain/**/actions.ts`. Confirm: (a) `npm run check:admin-auth` passes; (b) every `domain/**/actions.ts` export is a `defineAdminAction(...)` call, `role: "staff"` unless there is a written reason otherwise; (c) no Server Component under `(protected)` calls `db`/a domain query without the layout guard being its ancestor (it always is — the guard is in `(protected)/layout.tsx`); (d) no `page.tsx`/`route.ts` exists under `app/admin/` outside `(protected)` except `login`. Record the file count reviewed in the `docs/TASKS.md` close-out note.

- [ ] **Step 3: "One source of truth" audit (PRD §7 principle)**

Grep the Epic 2 diff for any place a financial or status value is written outside its owning domain function:

```powershell
Select-String -Path "app/admin/**/*.tsx","domain/**/*.ts" -Pattern "payment_status|paymentStatus\s*:" -AllMatches
```

Confirm `shoots.paymentStatus` is written only in `domain/payments/register-payment.ts`; `production_jobs.status` only in `domain/production/service.ts`; `shoots.status` only in `domain/production/service.ts` (the finalizado/entregue reflection) and a future dedicated shoot-status action (not in this epic). Nothing in a page/component writes a derived value.

- [ ] **Step 4: Manual E2E walkthrough (PRD §23)**

With `npm run dev` and a promoted staff/admin account, walk: create client → create Aurora shoot for her → confirm the production job + 6 prep tasks exist → register a partial payment → dashboard "recebido"/"a receber" and the shoot's `payment_status` badge both update → advance the production job to `finalizado` → the shoot status reflects to `finalizado` → the financeiro ledger shows the receipt. Screenshot the dashboard before/after the payment. Note the result in `docs/TASKS.md`.

- [ ] **Step 5: DECISIONS.md + TASKS.md close-out**

Add a `2026-09-05 — Epic 2 (Studio OS) closed` entry to `docs/DECISIONS.md` summarizing: the `defineAdminAction` + `check-admin-auth` enforcement model; hand-rolled primitives over shadcn; `db.transaction` for SCL-211/SCL-220/SCL-231; all KPIs/ledger/balances derived, never stored. In `docs/TASKS.md`, confirm every SCL-2xx row is `DONE` and every `Depends on`/`Blocks` across Epic 2 is accurate. Commit: `SCL-2xx: Epic 2 branch review — all tasks DONE, close-out notes`.

---

## Self-review notes

- **Spec coverage.** PRD §7.1 Dashboard → Task 2. §7.2 Clientes/CRM (ficha única, histórico, receita acumulada, indicação) → Tasks 3–5. §7.3 Leads → *out of Epic 2 scope per `docs/TASKS.md` backlog* (no SCL-2xx lead task; Lead schema SCL-101 exists, UI is a later epic — noted here so the gap is deliberate, not missed). §7.4 Agenda & Ensaios (list view, filters, client search, confirmed-shoot creation deriving job+checklist+portal, ficha) → Tasks 6–8. §7.5 Financeiro (Payment written once, derived saldo/status, Expense, no duplicated revenue) → Tasks 9–11. §7.6 Produção & Edição (job per confirmed shoot, Kanban, validated transitions, finalizado→Reveal signal, entregue→pós-venda signal) → Tasks 7, 12, 13. §7.7 Catálogo → read-only consumption in Task 7 (`listActivePackages`); no catalog CRUD task in the Epic 2 backlog (deferred). §7.8 Acervo → P2/P3, untouched. §7.9 Automações → `recordAuditEvent` on every mutation is the event layer's MVP surface; richer automation is a later epic. §16 acceptance criteria for "Clientes e ensaios", "Financeiro", "Produção" → covered by Tasks 3–13. §23 first-milestone E2E flow → Task 11 unblocks it; the branch review Step 4 walks it.
- **The auth-enforcement recommendation from Epic 1's final review is Task 1, not a per-task reminder:** `defineAdminAction` is the only way to write, `check-admin-auth.mjs` fails CI otherwise, and the `(protected)` route group guards every read. Every later task's action file is `defineAdminAction(...)` and the CI guard is in the verification suite of every task.
- **No new migrations.** Every task is `Migration: no`; the schema was frozen after Epic 1. Where a task needs a shape the schema lacks (e.g. a `profiles` display name in Task 12), the plan says to degrade gracefully and flag it, never to slip a migration into a UI task (PRD §19.7).
- **Money stays string end-to-end.** `lib/format.ts` formats for display only; all arithmetic goes through `domain/payments/balance.ts` (Epic 1) or the small cents helpers duplicated *only* inside pure, tested reducers (`dashboard/kpis.ts`, `finance/ledger.ts`) — never inside a component.
- **Derived, never stored.** Dashboard KPIs, the financial ledger, per-client lifetime revenue, per-shoot balance, and preparation progress are all recomputed on read. The one cache — `shoots.payment_status` — is written in exactly one place (`register-payment.ts`), inside the same transaction as the payment insert, and the branch review Step 3 greps to confirm it.
- **Transactions.** SCL-211 (shoot + job + checklist), SCL-220 (payment + cache), SCL-231 (job status + shoot reflection) each use one `db.transaction`; each has a `RUN_LIVE_DB_TESTS`-guarded integration test with `afterAll` cleanup, matching `docs/DECISIONS.md` (2026-09-04).
- **Type consistency.** `ActionResult<T>` is defined once (Task 1) and every action returns it. `toFormAction` is the only `FormData`→object path. `Column<Row>` (Task 1) is the only table column type. `ProductionCard` is defined once (Task 12) and imported by Task 13's components. `ClientForm`'s `initialValues` prop type is reused by Task 5's edit form via `React.ComponentProps`. Status-transition helpers (`canTransition*Status`, `allowedProductionTransitions`) are the single source for both the guard and the UI options.
- **Placeholder scan.** The two intentionally-flagged spots — Task 4 Step 5's throwaway `updateClientAction` stub (explicitly "do not commit", rewritten in Step 6) and Task 12's `ProductionStatusControl` forward-reference (resolved by doing Tasks 12+13 as one commit) — are called out inline with the resolution, not left as silent TODOs. Task 10 Step 7's `rowKey` typo is flagged with the fix. Everything else is complete code.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-05-epic2-studio-os.md`. Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent per task, two-stage review (spec-compliance + code-quality) between tasks, final whole-branch review after Task 14. This is the flow P0 and Epic 1 used.

**2. Inline Execution** — execute tasks in this session via `superpowers:executing-plans`, batching with checkpoints for review.

Which approach?

- **If Subagent-Driven:** REQUIRED SUB-SKILL `superpowers:subagent-driven-development` — fresh subagent per task + two-stage review; work committed directly to `main` (CI green per push); run the "Final branch review" section after Task 14.
- **If Inline Execution:** REQUIRED SUB-SKILL `superpowers:executing-plans` — batch execution with review checkpoints.
