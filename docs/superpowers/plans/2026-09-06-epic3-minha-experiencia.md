# Epic 3 — Minha Experiência Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the authenticated client portal that reads the same Shoot, Payment, PreparationTask, and styling data as Studio OS, enforces client ownership through grants/RLS, and closes the PRD §23 Admin-to-client status loop.

**Architecture:** Next.js verifies the Supabase session, links the Auth user to exactly one CRM Client, and renders the protected shell. Client-facing reads and mutations use cookie/browser Supabase clients carrying the user JWT, so PostgREST and Storage grants/RLS are exercised in the real path; Admin continues through Drizzle plus explicit RBAC. Pure portal rules select the canonical shoot and derive countdown, journey, preparation, and money views without persisted aggregates.

**Tech Stack:** Next.js 16.3.4 App Router/Proxy, React 19.2.8, TypeScript 5, Tailwind CSS 4, Supabase Auth/Data API/Storage, Drizzle ORM 0.45.2 + PostgreSQL RLS, Zod 4.5.4, Vitest 5 + Testing Library.

## Global Constraints

- Read the relevant local Next.js 16 guides in `node_modules/next/dist/docs/` before changing auth, Proxy, Server/Client Components, or data fetching; this repository's `AGENTS.md` requires it.
- Work directly on `main`; do not push until the whole epic, final review, and fix wave are complete.
- Follow TDD for every behavior change: failing focused test, confirm RED, minimal implementation, confirm GREEN, then commit.
- Never use `drizzle-kit push`; use exactly `--name epic3_client_fields`, `--name epic3_client_access`, `--name styling_references`, and `--name styling_storage_access` as specified below.
- Preserve existing hand-written FKs/indexes/checks. Inspect migration output for duplicate objects before applying it.
- Admin remains authorized by `defineAdminAction`/protected layout; client access never relies on Proxy or hidden UI alone.
- Client-facing Supabase access receives least-privilege column grants plus RLS. `anon` receives no client-data grant.
- `clients.auth_user_id = auth.uid()` is the client ownership root; eligible shoots additionally require `portal_enabled = true` and status other than `cancelado`.
- Money remains decimal strings; arithmetic goes only through `@/lib/money` and `domain/payments/balance.ts`. Never persist a portal balance or progress aggregate.
- Countdown and shoot selection use the studio calendar timezone `America/Manaus`, not UTC or device-local date boundaries.
- Styling bucket is private, accepts only `image/jpeg`, `image/png`, `image/webp`, caps objects at 8 MB, and caps references at 20 rows per shoot.
- Do not expose `clients.notes`, `shoots.notes`, `payments.proof_url`, payment notes, ProductionJob notes/editor, audit data, or raw database errors.
- `RUN_LIVE_DB_TESTS=true` is opt-in and still targets the only real Supabase project. Every live fixture, Auth user, and Storage object must be uniquely named and removed in `finally`/`afterAll`.
- Portal UI is mobile-first at 320 px, uses visible focus and roughly 44 px touch targets, and communicates timeline/progress without relying on color.
- Do not add SWR, TanStack Query, realtime subscriptions, or a new component library.

---

### Task 1: SCL-300 — Link passwordless Auth users to CRM clients

**Files:**
- Create: `lib/auth/client-link.ts`
- Modify: `app/auth/callback/route.ts`
- Modify: `app/(client)/login/page.tsx`
- Test: `tests/lib/client-link.test.ts`
- Modify: `docs/TASKS.md`

**Interfaces:**
- Consumes: verified Supabase Auth user `{ id: string; email: string }`; `clients.authUserId` unique/FK column.
- Produces: `normalizeClientEmail(email): string`; `decideClientLink(matches, authUserId): ClientLinkDecision`; `linkAuthUserToClient(user): Promise<{ clientId: string }>`; neutral callback error code `access`.

- [ ] **Step 1: Write the failing pure decision tests**

Create `tests/lib/client-link.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { decideClientLink, normalizeClientEmail } from "@/lib/auth/client-link";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ID = "00000000-0000-4000-8000-000000000002";

describe("client-link", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeClientEmail("  Maria@Example.COM ")).toBe("maria@example.com");
  });

  it("requests a link for one unlinked client", () => {
    expect(decideClientLink([{ id: "client-1", authUserId: null }], USER_ID)).toEqual({
      kind: "link",
      clientId: "client-1",
    });
  });

  it("accepts an idempotent existing link", () => {
    expect(decideClientLink([{ id: "client-1", authUserId: USER_ID }], USER_ID)).toEqual({
      kind: "linked",
      clientId: "client-1",
    });
  });

  it.each([
    [[], "no_match"],
    [[{ id: "a", authUserId: null }, { id: "b", authUserId: null }], "ambiguous"],
    [[{ id: "a", authUserId: OTHER_ID }], "owned_by_another_user"],
  ] as const)("denies unsafe link candidates", (matches, reason) => {
    expect(decideClientLink([...matches], USER_ID)).toEqual({ kind: "denied", reason });
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm run test -- tests/lib/client-link.test.ts`

Expected: FAIL because `@/lib/auth/client-link` does not exist.

- [ ] **Step 3: Implement the pure decision and race-safe server link**

Create `lib/auth/client-link.ts`:

```ts
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";

type ClientMatch = { id: string; authUserId: string | null };

export type ClientLinkDecision =
  | { kind: "link" | "linked"; clientId: string }
  | { kind: "denied"; reason: "no_match" | "ambiguous" | "owned_by_another_user" };

export class ClientAccessUnavailableError extends Error {
  constructor(public readonly reason: Extract<ClientLinkDecision, { kind: "denied" }>["reason"]) {
    super("client access unavailable");
    this.name = "ClientAccessUnavailableError";
  }
}

export function normalizeClientEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function decideClientLink(matches: ClientMatch[], authUserId: string): ClientLinkDecision {
  if (matches.length === 0) return { kind: "denied", reason: "no_match" };
  if (matches.length !== 1) return { kind: "denied", reason: "ambiguous" };
  const match = matches[0];
  if (match.authUserId === authUserId) return { kind: "linked", clientId: match.id };
  if (match.authUserId) return { kind: "denied", reason: "owned_by_another_user" };
  return { kind: "link", clientId: match.id };
}

export async function linkAuthUserToClient(user: {
  id: string;
  email: string;
}): Promise<{ clientId: string }> {
  const normalized = normalizeClientEmail(user.email);
  const matches = await db
    .select({ id: clients.id, authUserId: clients.authUserId })
    .from(clients)
    .where(sql`lower(trim(${clients.email})) = ${normalized}`)
    .limit(2);
  const decision = decideClientLink(matches, user.id);
  if (decision.kind === "denied") throw new ClientAccessUnavailableError(decision.reason);
  if (decision.kind === "linked") return { clientId: decision.clientId };

  const [linked] = await db
    .update(clients)
    .set({ authUserId: user.id })
    .where(and(eq(clients.id, decision.clientId), isNull(clients.authUserId)))
    .returning({ id: clients.id });
  if (linked) return { clientId: linked.id };

  const [raced] = await db
    .select({ id: clients.id, authUserId: clients.authUserId })
    .from(clients)
    .where(eq(clients.id, decision.clientId))
    .limit(1);
  if (raced?.authUserId === user.id) return { clientId: raced.id };
  throw new ClientAccessUnavailableError("owned_by_another_user");
}

export async function getLinkedClientByAuthUserId(
  authUserId: string
): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.authUserId, authUserId))
    .limit(1);
  return row ?? null;
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm run test -- tests/lib/client-link.test.ts`

Expected: PASS, 5 cases.

- [ ] **Step 5: Link after PKCE exchange and sanitize failure**

Update `app/auth/callback/route.ts` so the successful branch verifies the user, links it, and signs out on a rejected link:

```ts
import { NextResponse } from "next/server";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import { linkAuthUserToClient } from "@/lib/auth/client-link";
import { logger } from "@/lib/observability/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const destination = safeRedirect(searchParams.get("redirect"), "/minha-experiencia");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        try {
          await linkAuthUserToClient({ id: data.user.id, email: data.user.email });
          return NextResponse.redirect(`${origin}${destination}`);
        } catch (linkError) {
          logger.warn("client magic-link account could not be linked", {
            authUserId: data.user.id,
            errorName: linkError instanceof Error ? linkError.name : "unknown",
          });
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=access`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

In `app/(client)/login/page.tsx`, map `error === "access"` to the neutral copy `Não foi possível liberar seu acesso. Fale com o estúdio para confirmar seu cadastro.`; retain the existing generic `auth` message.

- [ ] **Step 6: Verify auth code and update the task board**

Run:

```bash
npm run test -- tests/lib/client-link.test.ts tests/lib/safe-redirect.test.ts tests/lib/session.test.ts
npm run typecheck
npm run lint
```

Expected: all focused tests PASS; typecheck and lint exit 0.

Update SCL-300 in `docs/TASKS.md` to DONE with the exact files, neutral failure behavior, and test command.

- [ ] **Step 7: Commit Task 1**

```bash
git add lib/auth/client-link.ts app/auth/callback/route.ts "app/(client)/login/page.tsx" tests/lib/client-link.test.ts docs/TASKS.md
git commit -m "SCL-300: link passwordless users to client records"
```

---

### Task 2: Client portal database foundation — safe fields, grants, and row ownership

**Files:**
- Modify: `db/schema/shoots.ts`
- Modify: `db/schema/preparation-tasks.ts`
- Modify: `domain/shoots/schema.ts`
- Modify: `domain/shoots/create-confirmed-shoot.ts`
- Modify: `domain/preparation/schema.ts`
- Create: `db/migrations/0024_epic3_client_fields.sql` (generated)
- Create: `db/migrations/0025_epic3_client_access.sql` (custom SQL)
- Modify: `db/migrations/meta/_journal.json`
- Create: `tests/db/client-portal-migrations.test.ts`
- Modify: `tests/domain/create-confirmed-shoot.test.ts`
- Modify: `tests/domain/preparation-tasks.test.ts`

**Interfaces:**
- Consumes: existing Client/Shoot/Payment/ExperiencePackage/PreparationTask tables and `public.is_staff_or_admin()`.
- Produces: `shoots.locationName/locationAddress/clientGuidance`; `preparationTasks.clientActionable`; `public.owns_portal_shoot(uuid)`; client-safe grants and RLS policies; DB-owned `completed_at` synchronization.

- [ ] **Step 1: Write failing schema/domain expectations**

Append to `tests/domain/create-confirmed-shoot.test.ts`:

```ts
it("marks visible starter tasks as client-actionable and payment as internal", () => {
  const tasks = buildInitialPreparationTasks();
  expect(tasks.filter((task) => task.visibleToClient).every((task) => task.clientActionable)).toBe(true);
  expect(tasks.find((task) => task.type === "pagamento")).toMatchObject({
    visibleToClient: false,
    clientActionable: false,
  });
});
```

Append both tests inside the existing `describe` in `tests/domain/preparation-tasks.test.ts`, using its `validBase` fixture:

```ts
it("defaults a new preparation task to non-actionable", () => {
  expect(createPreparationTaskSchema.parse(validBase)).toMatchObject({ clientActionable: false });
});

it("rejects a hidden actionable task", () => {
  expect(() => createPreparationTaskSchema.parse({
    ...validBase,
    visibleToClient: false,
    clientActionable: true,
  })).toThrow();
});
```

- [ ] **Step 2: Confirm RED**

Run: `npm run test -- tests/domain/create-confirmed-shoot.test.ts tests/domain/preparation-tasks.test.ts`

Expected: FAIL because `clientActionable` is absent.

- [ ] **Step 3: Extend schemas and starter composition**

Add to `shoots` in `db/schema/shoots.ts` after `startTime`:

```ts
locationName: text("location_name"),
locationAddress: text("location_address"),
clientGuidance: text("client_guidance"),
```

Add to `preparationTasks` in `db/schema/preparation-tasks.ts` after `visibleToClient`:

```ts
clientActionable: boolean("client_actionable").notNull().default(false),
```

Add optional client-safe fields to both `createShootSchema` and `updateShootSchema` in `domain/shoots/schema.ts`:

```ts
locationName: z.string().trim().max(120).optional(),
locationAddress: z.string().trim().max(300).optional(),
clientGuidance: z.string().trim().max(2000).optional(),
```

Extend `createPreparationTaskSchema` in `domain/preparation/schema.ts`:

```ts
clientActionable: z.boolean().default(false),
```

Then add this refinement after the object definition and use the refined schema as the export:

```ts
.refine((task) => !task.clientActionable || task.visibleToClient, {
  error: "uma tarefa editável pela cliente precisa estar visível",
  path: ["clientActionable"],
});
```

Change the form schema call from `.extend()` to `.safeExtend()` because the base schema now carries a refinement, and add `clientActionable: z.coerce.boolean().default(false)` beside the existing coerced visibility field.

Update `buildInitialPreparationTasks()` return type and all six rows to carry `clientActionable`; the five visible rows use `true`, payment uses `false`. Pass the field through the transactional insert.

- [ ] **Step 4: Confirm domain GREEN and generate the named schema migration**

Run:

```bash
npm run test -- tests/domain/create-confirmed-shoot.test.ts tests/domain/preparation-tasks.test.ts
npm run db:generate -- --name epic3_client_fields
```

Expected: tests PASS; Drizzle creates exactly `db/migrations/0024_epic3_client_fields.sql` and a new `0024_snapshot.json`. Inspect the SQL: only the four intended columns are added; no existing FK/index/check is dropped or recreated.

- [ ] **Step 5: Generate the exact custom migration shell**

Run: `npm run db:generate -- --custom --name epic3_client_access`

Expected: `db/migrations/0025_epic3_client_access.sql` plus journal entry `idx: 25`.

- [ ] **Step 6: Write the RLS/grant/trigger migration**

Replace the generated empty content of `db/migrations/0025_epic3_client_access.sql` with:

```sql
create or replace function public.owns_portal_shoot(target_shoot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shoots s
    join public.clients c on c.id = s.client_id
    where s.id = target_shoot_id
      and s.portal_enabled = true
      and s.status <> 'cancelado'
      and c.auth_user_id = auth.uid()
  );
$$;
--> statement-breakpoint
revoke all on function public.owns_portal_shoot(uuid) from public;
grant execute on function public.owns_portal_shoot(uuid) to authenticated;
--> statement-breakpoint

update public.preparation_tasks
set client_actionable = true
where visible_to_client = true
  and type in ('moodboard', 'figurino', 'clutch', 'make', 'confirmacao_horario');
--> statement-breakpoint
alter table public.preparation_tasks
  add constraint preparation_tasks_actionable_requires_visible
  check (not client_actionable or visible_to_client);
--> statement-breakpoint

update public.preparation_tasks
set completed_at = case when status = 'concluida' then coalesce(completed_at, now()) else null end;
--> statement-breakpoint
create or replace function public.sync_preparation_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'concluida' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger preparation_tasks_sync_completed_at
before insert or update of status on public.preparation_tasks
for each row execute function public.sync_preparation_completed_at();
--> statement-breakpoint
alter table public.preparation_tasks
  add constraint preparation_tasks_status_completed_consistent
  check ((status = 'concluida') = (completed_at is not null));
--> statement-breakpoint

grant select (id, name) on table public.clients to authenticated;
grant select (
  id, client_id, experience_package_id, shoot_date, start_time, status,
  agreed_price, payment_status, portal_enabled, location_name, location_address,
  client_guidance
) on table public.shoots to authenticated;
grant select (
  id, name, included_photos, duration_minutes, scenes, make_included,
  outfits_limit, clutch_included
) on table public.experience_packages to authenticated;
grant select (id, shoot_id, amount, paid_at, status) on table public.payments to authenticated;
grant select (
  id, shoot_id, type, title, status, due_at, visible_to_client,
  client_actionable, completed_at, created_at
) on table public.preparation_tasks to authenticated;
grant update (status) on table public.preparation_tasks to authenticated;
--> statement-breakpoint

create policy clients_client_read on public.clients
for select to authenticated
using (auth_user_id = auth.uid());
--> statement-breakpoint
create policy shoots_client_read on public.shoots
for select to authenticated
using (public.owns_portal_shoot(id));
--> statement-breakpoint
create policy experience_packages_client_read on public.experience_packages
for select to authenticated
using (
  exists (
    select 1 from public.shoots s
    where s.experience_package_id = experience_packages.id
      and public.owns_portal_shoot(s.id)
  )
);
--> statement-breakpoint
create policy payments_client_read on public.payments
for select to authenticated
using (status = 'confirmado' and public.owns_portal_shoot(shoot_id));
--> statement-breakpoint
create policy preparation_tasks_client_read on public.preparation_tasks
for select to authenticated
using (visible_to_client = true and public.owns_portal_shoot(shoot_id));
--> statement-breakpoint
create policy preparation_tasks_client_update on public.preparation_tasks
for update to authenticated
using (client_actionable = true and public.owns_portal_shoot(shoot_id))
with check (client_actionable = true and visible_to_client = true and public.owns_portal_shoot(shoot_id));
```

Before committing, verify in PostgreSQL docs/current Supabase behavior that the unqualified target-table references in each policy resolve as intended and that the security-definer function owns a role allowed to read these tables. Keep `search_path = ''` and fully qualified names.

- [ ] **Step 7: Add static migration contract tests**

Create `tests/db/client-portal-migrations.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.resolve("db/migrations/0025_epic3_client_access.sql"),
  "utf8"
);

describe("Epic 3 client access migration", () => {
  it("roots ownership in clients.auth_user_id and portal_enabled", () => {
    expect(sql).toContain("c.auth_user_id = auth.uid()");
    expect(sql).toContain("s.portal_enabled = true");
    expect(sql).toContain("s.status <> 'cancelado'");
  });

  it("uses column grants instead of blanket client-data select", () => {
    expect(sql).toContain("grant select (id, name) on table public.clients");
    expect(sql).not.toMatch(/grant select on table public\.(clients|shoots|payments|preparation_tasks)/);
    expect(sql).not.toContain("to anon");
  });

  it("limits checklist writes to status and actionable rows", () => {
    expect(sql).toContain("grant update (status)");
    expect(sql).toContain("client_actionable = true");
    expect(sql).toContain("preparation_tasks_sync_completed_at");
  });
});
```

- [ ] **Step 8: Apply and verify against the live database**

Run:

```bash
npm run test -- tests/db/client-portal-migrations.test.ts tests/domain/create-confirmed-shoot.test.ts tests/domain/preparation-tasks.test.ts
npm run predb:migrate
npm run db:migrate
```

Expected: tests PASS; migration succeeds. Query `information_schema.role_column_grants`, `pg_policies`, `pg_proc`, `pg_trigger`, and `pg_constraint` to verify each grant/policy/helper/trigger/check by name. Record exact results in `docs/TASKS.md` or the task progress log.

- [ ] **Step 9: Run the task gate and commit**

Run:

```bash
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
```

Expected: all pass; live-only tests remain skipped without the flag.

```bash
git add db/schema/shoots.ts db/schema/preparation-tasks.ts db/migrations/ domain/shoots/schema.ts domain/shoots/create-confirmed-shoot.ts domain/preparation/schema.ts tests/db/client-portal-migrations.test.ts tests/domain/create-confirmed-shoot.test.ts tests/domain/preparation-tasks.test.ts
git commit -m "SCL-302: add client-safe fields and portal row access"
```

---

### Task 3: SCL-301 — Protected portal shell and responsive navigation

**Files:**
- Create: `app/(client)/minha-experiencia/layout.tsx`
- Create: `app/(client)/minha-experiencia/sign-out.ts`
- Create: `components/client/client-nav.tsx`
- Create: `components/client/client-sign-out-button.tsx`
- Test: `tests/components/client-nav.test.tsx`
- Modify: `docs/TASKS.md`

**Interfaces:**
- Consumes: `getCurrentUser()` and `getLinkedClientByAuthUserId()` from Task 1.
- Produces: protected Client layout; `ClientNav`; `clientSignOutAction`; four valid portal destinations and no Gallery dead link.

- [ ] **Step 1: Write the failing navigation test**

Create `tests/components/client-nav.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientNav } from "@/components/client/client-nav";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

describe("ClientNav", () => {
  beforeEach(() => usePathname.mockReturnValue("/minha-experiencia"));

  it("renders only implemented portal destinations", () => {
    render(<ClientNav />);
    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "/minha-experiencia");
    expect(screen.getByRole("link", { name: "Checklist" })).toHaveAttribute("href", "/minha-experiencia/checklist");
    expect(screen.getByRole("link", { name: "Meu ensaio" })).toHaveAttribute("href", "/minha-experiencia/ensaio");
    expect(screen.getByRole("link", { name: "Styling" })).toHaveAttribute("href", "/minha-experiencia/styling");
    expect(screen.queryByRole("link", { name: /galeria/i })).not.toBeInTheDocument();
  });

  it("marks the current destination", () => {
    usePathname.mockReturnValue("/minha-experiencia/checklist");
    render(<ClientNav />);
    expect(screen.getByRole("link", { name: "Checklist" })).toHaveAttribute("aria-current", "page");
  });
});
```

- [ ] **Step 2: Confirm RED**

Run: `npm run test -- tests/components/client-nav.test.tsx`

Expected: FAIL because `ClientNav` does not exist.

- [ ] **Step 3: Implement the client navigation**

Create `components/client/client-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/minha-experiencia", label: "Início" },
  { href: "/minha-experiencia/checklist", label: "Checklist" },
  { href: "/minha-experiencia/ensaio", label: "Meu ensaio" },
  { href: "/minha-experiencia/styling", label: "Styling" },
] as const;

export function ClientNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Minha Experiência"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-cream px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:static md:flex md:border-0 md:p-0"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/minha-experiencia"
            ? pathname === link.href
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center px-2 text-center font-sans text-[10px] uppercase tracking-[0.12em] transition-colors",
              active ? "text-ink underline underline-offset-8" : "text-muted hover:text-ink"
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

- [ ] **Step 4: Implement client logout**

Create `app/(client)/minha-experiencia/sign-out.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function clientSignOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

Create `components/client/client-sign-out-button.tsx`:

```tsx
import { clientSignOutAction } from "@/app/(client)/minha-experiencia/sign-out";

export function ClientSignOutButton() {
  return (
    <form action={clientSignOutAction}>
      <button className="min-h-11 font-sans text-[10px] uppercase tracking-[0.16em] text-muted hover:text-ink">
        Sair
      </button>
    </form>
  );
}
```

Do not wrap logout in `defineAdminAction`: this is not an Admin mutation, and the action reads no business data. The action still derives its own cookie-bound session and never accepts a user ID.

- [ ] **Step 5: Implement the protected nested layout**

Create `app/(client)/minha-experiencia/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { ClientNav } from "@/components/client/client-nav";
import { ClientSignOutButton } from "@/components/client/client-sign-out-button";
import { getLinkedClientByAuthUserId } from "@/lib/auth/client-link";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MinhaExperienciaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=%2Fminha-experiencia");

  const client = await getLinkedClientByAuthUserId(user.id);
  if (!client) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-6 py-12">
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">Minha Experiência</p>
        <h1 className="font-serif text-4xl font-light">Seu acesso ainda não está disponível.</h1>
        <p className="font-sans text-sm leading-6 text-muted">
          Fale com o estúdio para confirmarmos o e-mail do seu cadastro.
        </p>
        <ClientSignOutButton />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-20 text-ink md:pb-0">
      <header className="border-b border-line px-5 py-4 md:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6">
          <div>
            <p className="font-serif text-xl font-light">Stúdio Carol Lucas</p>
            <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted">Minha Experiência</p>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <ClientNav />
            <ClientSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">{children}</main>
      <div className="md:hidden"><ClientNav /></div>
    </div>
  );
}
```

- [ ] **Step 6: Run the task gate and update SCL-301**

Run:

```bash
npm run test -- tests/components/client-nav.test.tsx
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: tests and checks pass; build lists the four portal routes once later tasks create their pages. At this task, missing child destinations are acceptable only until Tasks 5–9 land in the same epic; do not manually navigate them during this checkpoint.

Mark SCL-301 DONE in `docs/TASKS.md` with the protected-layout behavior and test evidence.

- [ ] **Step 7: Commit Task 3**

```bash
git add "app/(client)/minha-experiencia/layout.tsx" "app/(client)/minha-experiencia/sign-out.ts" components/client/ tests/components/client-nav.test.tsx docs/TASKS.md
git commit -m "SCL-301: add protected client portal shell"
```

---

### Task 4: SCL-302 domain core — shoot selection, countdown, journey, next action, and money

**Files:**
- Create: `domain/portal/types.ts`
- Create: `domain/portal/selection.ts`
- Create: `domain/portal/countdown.ts`
- Create: `domain/portal/journey.ts`
- Create: `domain/portal/summary.ts`
- Test: `tests/domain/portal-selection.test.ts`
- Test: `tests/domain/portal-countdown.test.ts`
- Test: `tests/domain/portal-journey.test.ts`
- Test: `tests/domain/portal-summary.test.ts`

**Interfaces:**
- Produces: `PortalShoot`, `PortalTask`, `PortalPayment`; `selectPortalShoot`; `studioDate`; `daysUntilShoot`; `getJourney`; `summarizePortalPreparation`; `summarizePortalMoney`.
- Consumed later by: the shared Supabase read model, home, checklist, and Meu Ensaio.

- [ ] **Step 1: Define the client-safe types**

Create `domain/portal/types.ts`:

```ts
export type PortalShootStatus =
  | "reserva" | "preparacao" | "realizado" | "edicao" | "finalizado"
  | "reveal" | "entregue" | "cancelado" | "reagendado";

export type PortalShoot = {
  id: string;
  clientId: string;
  experiencePackageId: string;
  shootDate: string;
  startTime: string | null;
  status: PortalShootStatus;
  agreedPrice: string;
  paymentStatus: string;
  portalEnabled: boolean;
  locationName: string | null;
  locationAddress: string | null;
  clientGuidance: string | null;
};

export type PortalTask = {
  id: string;
  shootId: string;
  type: string;
  title: string;
  status: "pendente" | "em_andamento" | "concluida";
  dueAt: string | null;
  visibleToClient: boolean;
  clientActionable: boolean;
  completedAt: string | null;
  createdAt: string;
};

export type PortalPayment = {
  id: string;
  shootId: string;
  amount: string;
  paidAt: string | null;
  status: "confirmado";
};
```

- [ ] **Step 2: Write failing selection and countdown tests**

Create `tests/domain/portal-selection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { selectPortalShoot } from "@/domain/portal/selection";
import type { PortalShoot, PortalShootStatus } from "@/domain/portal/types";

function shoot(
  id: string,
  shootDate: string,
  status: PortalShootStatus = "preparacao",
  portalEnabled = true
): PortalShoot {
  return {
    id, shootDate, status, portalEnabled,
    clientId: "client-1", experiencePackageId: "package-1", startTime: null,
    agreedPrice: "1000.00", paymentStatus: "nao_iniciado",
    locationName: null, locationAddress: null, clientGuidance: null,
  };
}

describe("selectPortalShoot", () => {
  it("selects the nearest future active shoot regardless of input order", () => {
    expect(selectPortalShoot([
      shoot("past", "2026-09-01"), shoot("later", "2026-10-10"), shoot("next", "2026-09-18")
    ], "2026-09-06")?.id).toBe("next");
  });
  it("skips a delivered future row and selects same-day active", () => {
    expect(selectPortalShoot([
      shoot("delivered-future", "2026-09-20", "entregue"), shoot("same-day", "2026-09-06")
    ], "2026-09-06")?.id).toBe("same-day");
  });
  it("falls back to the most recent past row including delivered", () => {
    expect(selectPortalShoot([
      shoot("older", "2026-08-01"), shoot("delivered-past", "2026-09-01", "entregue")
    ], "2026-09-06")?.id).toBe("delivered-past");
  });
  it("excludes cancelled and portal-disabled rows", () => {
    expect(selectPortalShoot([
      shoot("cancelled", "2026-09-10", "cancelado"), shoot("disabled", "2026-09-11", "preparacao", false)
    ], "2026-09-06")).toBeNull();
  });
  it("returns null for no rows", () => {
    expect(selectPortalShoot([], "2026-09-06")).toBeNull();
  });
});
```

Create `tests/domain/portal-countdown.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { daysUntilShoot, studioDate } from "@/domain/portal/countdown";

describe("portal countdown", () => {
  it("uses the Manaus calendar date at a UTC boundary", () => {
    expect(studioDate(new Date("2026-09-07T02:30:00.000Z"))).toBe("2026-09-06");
  });
  it("counts calendar days without DST/device timezone", () => {
    expect(daysUntilShoot("2026-09-18", "2026-09-06")).toBe(12);
    expect(daysUntilShoot("2026-09-06", "2026-09-06")).toBe(0);
    expect(daysUntilShoot("2026-09-05", "2026-09-06")).toBe(-1);
  });
});
```

- [ ] **Step 3: Confirm selection/countdown RED**

Run: `npm run test -- tests/domain/portal-selection.test.ts tests/domain/portal-countdown.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement selection and studio-calendar functions**

Create `domain/portal/selection.ts`:

```ts
import type { PortalShoot } from "./types";

export function selectPortalShoot(shoots: PortalShoot[], today: string): PortalShoot | null {
  const eligible = shoots.filter((shoot) => shoot.portalEnabled && shoot.status !== "cancelado");
  const future = eligible
    .filter((shoot) => shoot.shootDate >= today && shoot.status !== "entregue")
    .sort((a, b) => a.shootDate.localeCompare(b.shootDate));
  if (future[0]) return future[0];
  return eligible
    .filter((shoot) => shoot.shootDate <= today)
    .sort((a, b) => b.shootDate.localeCompare(a.shootDate))[0] ?? null;
}
```

Create `domain/portal/countdown.ts`:

```ts
const STUDIO_TIME_ZONE = "America/Manaus";

export function studioDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function daysUntilShoot(shootDate: string, today = studioDate()): number {
  const toUtc = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(shootDate) - toUtc(today)) / 86_400_000);
}
```

- [ ] **Step 5: Write failing journey/summary tests**

Create `tests/domain/portal-journey.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getJourney } from "@/domain/portal/journey";
import type { PortalShootStatus } from "@/domain/portal/types";

const statuses: PortalShootStatus[] = [
  "reserva", "preparacao", "realizado", "edicao", "finalizado",
  "reveal", "entregue", "cancelado", "reagendado",
];

describe("getJourney", () => {
  it("maps every status to client-facing copy", () => {
    for (const status of statuses) {
      expect(getJourney(status).label.length).toBeGreaterThan(0);
      expect(getJourney(status).tip.length).toBeGreaterThan(0);
    }
  });
  it("maps the active client journey phases", () => {
    expect(getJourney("preparacao")).toMatchObject({ step: 2, label: "Preparação" });
    expect(getJourney("edicao").tip).toMatch(/acabamento final/);
    expect(getJourney("finalizado").label).toMatch(/Reveal/);
    expect(getJourney("entregue").tip).toMatch(/Obrigada/);
  });
});
```

Create `tests/domain/portal-summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarizePortalMoney, summarizePortalPreparation } from "@/domain/portal/summary";

describe("portal summaries", () => {
  it("prioritizes actionable incomplete tasks by due date", () => {
    const tasks = [
      { id: "later", title: "Depois", status: "pendente", clientActionable: true, visibleToClient: true, dueAt: "2026-09-12", createdAt: "2026-09-01" },
      { id: "now", title: "Agora", status: "em_andamento", clientActionable: true, visibleToClient: true, dueAt: "2026-09-10", createdAt: "2026-09-02" },
      { id: "hidden", title: "Interna", status: "pendente", clientActionable: true, visibleToClient: false, dueAt: "2026-09-01", createdAt: "2026-09-01" },
    ];
    expect(summarizePortalPreparation(tasks)).toMatchObject({
      total: 2,
      done: 0,
      pct: 0,
      nextTask: { id: "now", title: "Agora", actionable: true },
    });
  });

  it("falls back to informational incomplete work", () => {
    const result = summarizePortalPreparation([
      { id: "info", title: "Aguardar confirmação", status: "pendente", clientActionable: false, visibleToClient: true, dueAt: null, createdAt: "2026-09-01" },
    ]);
    expect(result.nextTask).toEqual({ id: "info", title: "Aguardar confirmação", actionable: false });
  });

  it("derives paid total, balance, and status from confirmed rows", () => {
    expect(summarizePortalMoney("1000.00", [
      { amount: "250.00", status: "confirmado" },
      { amount: "100.00", status: "pendente" },
    ])).toEqual({ agreed: "1000.00", paid: "250.00", balance: "750.00", status: "parcial" });
  });
});
```

Type the preparation-test fixture parameter with the narrow local shape accepted by the function; do not use `as any`.

- [ ] **Step 6: Implement journey and summary rules**

Create `domain/portal/journey.ts` with an exhaustive `Record<PortalShootStatus, JourneyState>`; use these exact client labels:

```ts
import type { PortalShootStatus } from "./types";

export type JourneyState = { step: number; label: string; tip: string };

const JOURNEY: Record<PortalShootStatus, JourneyState> = {
  reserva: { step: 1, label: "Reserva confirmada", tip: "Sua experiência já começou." },
  preparacao: { step: 2, label: "Preparação", tip: "Vamos construir cada detalhe juntas." },
  reagendado: { step: 2, label: "Reorganizando sua data", tip: "O estúdio confirmará os próximos detalhes." },
  realizado: { step: 3, label: "Ensaio realizado", tip: "Agora começa a curadoria das suas imagens." },
  edicao: { step: 4, label: "Edição", tip: "Suas imagens estão recebendo o acabamento final." },
  finalizado: { step: 4, label: "Reveal em preparação", tip: "Seu Reveal está quase pronto." },
  reveal: { step: 5, label: "Reveal disponível", tip: "É hora de viver suas imagens." },
  entregue: { step: 6, label: "Experiência entregue", tip: "Obrigada por confiar sua história ao estúdio." },
  cancelado: { step: 0, label: "Ensaio cancelado", tip: "Fale com o estúdio se precisar de ajuda." },
};

export function getJourney(status: PortalShootStatus): JourneyState {
  return JOURNEY[status];
}
```

Create `domain/portal/summary.ts`:

```ts
import { calculateBalance, deriveShootPaymentStatus } from "@/domain/payments/balance";
import { addDecimal } from "@/lib/money";

type PreparationInput = {
  id: string; title: string; status: string; clientActionable: boolean;
  visibleToClient: boolean; dueAt: string | null; createdAt: string;
};

export function summarizePortalPreparation(tasks: PreparationInput[]) {
  const visible = tasks.filter((task) => task.visibleToClient);
  const done = visible.filter((task) => task.status === "concluida").length;
  const incomplete = visible
    .filter((task) => task.status !== "concluida")
    .sort((a, b) =>
      (a.dueAt ?? "9999-12-31").localeCompare(b.dueAt ?? "9999-12-31") ||
      a.createdAt.localeCompare(b.createdAt)
    );
  const next = incomplete.find((task) => task.clientActionable) ?? incomplete[0] ?? null;
  return {
    total: visible.length,
    done,
    pct: visible.length === 0 ? 0 : Math.round((done / visible.length) * 100),
    nextTask: next ? { id: next.id, title: next.title, actionable: next.clientActionable } : null,
  };
}

type PaymentInput = { amount: string; status: "pendente" | "confirmado" | "estornado" };

export function summarizePortalMoney(agreed: string, payments: PaymentInput[]) {
  const paid = payments
    .filter((payment) => payment.status === "confirmado")
    .reduce((total, payment) => addDecimal(total, payment.amount), "0.00");
  return {
    agreed,
    paid,
    balance: calculateBalance(agreed, payments),
    status: deriveShootPaymentStatus(agreed, payments),
  };
}
```

- [ ] **Step 7: Run the domain gate and commit**

Run:

```bash
npm run test -- tests/domain/portal-selection.test.ts tests/domain/portal-countdown.test.ts tests/domain/portal-journey.test.ts tests/domain/portal-summary.test.ts
npm run typecheck
npm run lint
```

Expected: all new tests PASS; typecheck/lint exit 0.

```bash
git add domain/portal/ tests/domain/portal-selection.test.ts tests/domain/portal-countdown.test.ts tests/domain/portal-journey.test.ts tests/domain/portal-summary.test.ts
git commit -m "SCL-302: derive the client journey view"
```

---

### Task 5: SCL-302 — Shared Supabase read model and C+ journey home

**Files:**
- Create: `domain/portal/read.ts`
- Create: `components/client/journey-home.tsx`
- Replace: `app/(client)/minha-experiencia/page.tsx`
- Create: `app/(client)/minha-experiencia/error.tsx`
- Test: `tests/components/journey-home.test.tsx`
- Create: `tests/domain/portal-rls.integration.test.ts`
- Modify: `docs/TASKS.md`

**Interfaces:**
- Consumes: Task 4 pure rules and a cookie/browser `SupabaseClient` carrying the user JWT.
- Produces: `PortalSnapshot`; `readPortalSnapshot(supabase, now?)`; C+ home rendering; reusable live-RLS fixture pattern.

- [ ] **Step 1: Write the failing C+ home test**

Create `tests/components/journey-home.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JourneyHome } from "@/components/client/journey-home";

const snapshot = {
  client: { id: "client-1", name: "Mariana" },
  shoot: {
    id: "shoot-1", clientId: "client-1", experiencePackageId: "package-1",
    shootDate: "2026-09-18", startTime: "15:00:00", status: "preparacao" as const,
    agreedPrice: "1000.00", paymentStatus: "parcial", portalEnabled: true,
    locationName: null, locationAddress: null, clientGuidance: null,
  },
  experience: { id: "package-1", name: "Aurora", includedPhotos: 20, durationMinutes: 90, scenes: "2", makeIncluded: true, outfitsLimit: 3, clutchIncluded: true },
  tasks: [
    { id: "done", shootId: "shoot-1", type: "moodboard", title: "Moodboard", status: "concluida" as const, dueAt: null, visibleToClient: true, clientActionable: true, completedAt: "2026-09-01T12:00:00Z", createdAt: "2026-08-30T12:00:00Z" },
    { id: "next", shootId: "shoot-1", type: "figurino", title: "Escolher figurinos", status: "pendente" as const, dueAt: null, visibleToClient: true, clientActionable: true, completedAt: null, createdAt: "2026-08-31T12:00:00Z" },
  ],
  payments: [{ id: "payment-1", shootId: "shoot-1", amount: "250.00", paidAt: "2026-09-01T12:00:00Z", status: "confirmado" as const }],
};

describe("JourneyHome", () => {
  it("prioritizes the journey and one next action", () => {
    render(<JourneyHome snapshot={snapshot} today="2026-09-06" />);
    expect(screen.getByRole("heading", { name: /sua experiência aurora/i })).toBeInTheDocument();
    expect(screen.getByText("Faltam 12 dias")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("heading", { name: "Escolher figurinos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continuar preparação/i })).toHaveAttribute("href", "/minha-experiencia/styling");
  });

  it("renders a welcoming empty state without an eligible shoot", () => {
    render(<JourneyHome snapshot={{ ...snapshot, shoot: null, experience: null, tasks: [], payments: [] }} today="2026-09-06" />);
    expect(screen.getByRole("heading", { name: /estamos preparando seu espaço/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Confirm RED**

Run: `npm run test -- tests/components/journey-home.test.tsx`

Expected: FAIL because `JourneyHome` does not exist.

- [ ] **Step 3: Implement the shared read model**

Create `domain/portal/read.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { studioDate } from "./countdown";
import { selectPortalShoot } from "./selection";
import type { PortalPayment, PortalShoot, PortalTask } from "./types";

export type PortalExperience = {
  id: string; name: string; includedPhotos: number; durationMinutes: number;
  scenes: string | null; makeIncluded: boolean; outfitsLimit: number | null;
  clutchIncluded: boolean;
};

export type PortalSnapshot = {
  client: { id: string; name: string };
  shoot: PortalShoot | null;
  experience: PortalExperience | null;
  tasks: PortalTask[];
  payments: PortalPayment[];
};

export class PortalReadError extends Error {
  constructor(
    public readonly code: "unauthenticated" | "unlinked" | "query_failed",
    cause?: unknown
  ) {
    super("portal data unavailable", { cause });
    this.name = "PortalReadError";
  }
}

function queryFailed(cause: unknown): never {
  throw new PortalReadError("query_failed", cause);
}

export async function readPortalSnapshot(
  supabase: SupabaseClient,
  now = new Date()
): Promise<PortalSnapshot> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new PortalReadError("unauthenticated");

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id,name")
    .maybeSingle();
  if (clientError) queryFailed(clientError);
  if (!clientData) throw new PortalReadError("unlinked");

  const { data: shootData, error: shootError } = await supabase
    .from("shoots")
    .select("id,client_id,experience_package_id,shoot_date,start_time,status,agreed_price,payment_status,portal_enabled,location_name,location_address,client_guidance")
    .eq("client_id", clientData.id);
  if (shootError) queryFailed(shootError);
  const shoots = (shootData ?? []).map((row) => ({
    id: row.id, clientId: row.client_id, experiencePackageId: row.experience_package_id,
    shootDate: row.shoot_date, startTime: row.start_time, status: row.status,
    agreedPrice: row.agreed_price, paymentStatus: row.payment_status,
    portalEnabled: row.portal_enabled, locationName: row.location_name,
    locationAddress: row.location_address, clientGuidance: row.client_guidance,
  })) as PortalShoot[];
  const shoot = selectPortalShoot(shoots, studioDate(now));
  if (!shoot) return { client: clientData, shoot: null, experience: null, tasks: [], payments: [] };

  const [experienceResult, tasksResult, paymentsResult] = await Promise.all([
    supabase.from("experience_packages").select("id,name,included_photos,duration_minutes,scenes,make_included,outfits_limit,clutch_included").eq("id", shoot.experiencePackageId).maybeSingle(),
    supabase.from("preparation_tasks").select("id,shoot_id,type,title,status,due_at,visible_to_client,client_actionable,completed_at,created_at").eq("shoot_id", shoot.id).order("due_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }),
    supabase.from("payments").select("id,shoot_id,amount,paid_at,status").eq("shoot_id", shoot.id).eq("status", "confirmado").order("paid_at", { ascending: true }),
  ]);
  if (experienceResult.error || tasksResult.error || paymentsResult.error) {
    queryFailed(experienceResult.error ?? tasksResult.error ?? paymentsResult.error);
  }

  const experience = experienceResult.data ? {
    id: experienceResult.data.id, name: experienceResult.data.name,
    includedPhotos: experienceResult.data.included_photos,
    durationMinutes: experienceResult.data.duration_minutes,
    scenes: experienceResult.data.scenes, makeIncluded: experienceResult.data.make_included,
    outfitsLimit: experienceResult.data.outfits_limit,
    clutchIncluded: experienceResult.data.clutch_included,
  } : null;
  const tasks = (tasksResult.data ?? []).map((row) => ({
    id: row.id, shootId: row.shoot_id, type: row.type, title: row.title,
    status: row.status, dueAt: row.due_at, visibleToClient: row.visible_to_client,
    clientActionable: row.client_actionable, completedAt: row.completed_at,
    createdAt: row.created_at,
  })) as PortalTask[];
  const payments = (paymentsResult.data ?? []).map((row) => ({
    id: row.id, shootId: row.shoot_id, amount: row.amount,
    paidAt: row.paid_at, status: "confirmado" as const,
  }));
  return { client: clientData, shoot, experience, tasks, payments };
}
```

Keep the shared module free of server-only logging imports. Its public error is always `PortalReadError`; the route-level error boundary captures the original rendered exception through Sentry without exposing `PostgrestError.message`.

- [ ] **Step 4: Implement the C+ presentational component**

Create `components/client/journey-home.tsx`. It must use `getJourney`, `daysUntilShoot`, `summarizePortalPreparation`, and `formatShootDate`; render six ordered stages with text markers; and render exactly one primary next-action link. Use this routing function inside the file:

```tsx
function nextHref(taskType: string | undefined): string {
  return taskType && ["moodboard", "figurino", "clutch", "make"].includes(taskType)
    ? "/minha-experiencia/styling"
    : "/minha-experiencia/checklist";
}
```

The progress element must be:

```tsx
<div
  role="progressbar"
  aria-label="Progresso da preparação"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={preparation.pct}
  className="h-2 bg-champ"
>
  <div className="h-2 bg-ink" style={{ width: `${preparation.pct}%` }} />
</div>
```

The no-shoot branch must render the heading `Estamos preparando seu espaço.` and the sentence `Quando seu próximo ensaio for liberado, toda a jornada aparecerá aqui.` The populated branch must render `Sua experiência ${snapshot.experience.name}`, `Faltam N dias` only for positive countdown, `É hoje` for zero, and omit a future countdown for negative values.

- [ ] **Step 5: Replace the placeholder page with the RLS-backed read**

Replace `app/(client)/minha-experiencia/page.tsx`:

```tsx
import { JourneyHome } from "@/components/client/journey-home";
import { studioDate } from "@/domain/portal/countdown";
import { readPortalSnapshot } from "@/domain/portal/read";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientHome() {
  const supabase = await createSupabaseServerClient();
  const snapshot = await readPortalSnapshot(supabase);
  return <JourneyHome snapshot={snapshot} today={studioDate()} />;
}
```

Add `app/(client)/minha-experiencia/error.tsx` as a Client Component that reports the exception to Sentry in `useEffect`, renders `Não conseguimos carregar sua experiência.`, and offers a native retry button calling `reset()`.

- [ ] **Step 6: Add the opt-in two-client RLS integration harness**

Create `tests/domain/portal-rls.integration.test.ts`. Under `describeIfLiveDb`, create two Auth users through a service-role Supabase client, sign each in through an anon-key client, insert matching Client/Shoot/Payment/PreparationTask fixtures through Drizzle, and call `readPortalSnapshot()` with each authenticated client.

Use these exact assertions:

```ts
expect(firstSnapshot.client.id).toBe(firstClientId);
expect(firstSnapshot.shoot?.id).toBe(firstShootId);
expect(firstSnapshot.payments.map((row) => row.amount)).toEqual(["250.00"]);
expect(firstSnapshot.tasks.map((row) => row.title)).toEqual(["Tarefa visível A"]);
expect(secondSnapshot.client.id).toBe(secondClientId);
expect(secondSnapshot.shoot?.id).toBe(secondShootId);

const guessed = await firstSupabase.from("shoots").select("id").eq("id", secondShootId);
expect(guessed.error).toBeNull();
expect(guessed.data).toEqual([]);
```

Also insert one pending payment and one hidden task for the first shoot and assert they are absent. Cleanup order in `afterAll` is Storage rows if introduced later, preparation tasks, payments, production jobs, shoots, clients, then `admin.auth.admin.deleteUser()` for both Auth users. Guard every possibly-unassigned ID.

- [ ] **Step 7: Run non-live and live verification**

Run:

```bash
npm run test -- tests/components/journey-home.test.tsx tests/domain/portal-selection.test.ts tests/domain/portal-summary.test.ts
$env:RUN_LIVE_DB_TESTS='true'; npm run test -- tests/domain/portal-rls.integration.test.ts
```

Expected: component/domain tests PASS; live test proves cross-client reads return zero rows and both users see only their own composition. Clear the task-local environment variable after the command in the same PowerShell session.

- [ ] **Step 8: Update SCL-302 and commit**

Document the selection order, RLS-backed read path, live two-client evidence, and C+ mobile behavior in `docs/TASKS.md`; mark SCL-302 DONE only after the live assertions pass.

```bash
git add domain/portal/read.ts components/client/journey-home.tsx "app/(client)/minha-experiencia/page.tsx" "app/(client)/minha-experiencia/error.tsx" tests/components/journey-home.test.tsx tests/domain/portal-rls.integration.test.ts docs/TASKS.md
git commit -m "SCL-302: connect the client journey home"
```

---

### Task 6: SCL-303 — Client-actionable checklist and Admin controls

**Files:**
- Create: `domain/portal/checklist.ts`
- Create: `components/client/client-checklist.tsx`
- Create: `app/(client)/minha-experiencia/checklist/page.tsx`
- Modify: `app/admin/(protected)/agenda/[id]/preparacao/page.tsx`
- Modify: `app/admin/(protected)/agenda/[id]/preparacao/checklist.tsx`
- Test: `tests/domain/client-checklist.test.ts`
- Test: `tests/components/client-checklist.test.tsx`
- Modify: `tests/domain/portal-rls.integration.test.ts`
- Modify: `docs/TASKS.md`

**Interfaces:**
- Consumes: `PortalTask`, `readPortalSnapshot`, Task 2 trigger/grant/RLS, `createSupabaseBrowserClient`.
- Produces: `setClientTaskStatus(client, taskId, status)` and client checklist UI; Admin can explicitly set visibility/actionability.

- [ ] **Step 1: Write failing mutation and component tests**

Create `tests/domain/client-checklist.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { setClientTaskStatus } from "@/domain/portal/checklist";

describe("setClientTaskStatus", () => {
  it("updates only the status column and returns the database row", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "task-1", status: "concluida", completed_at: "2026-09-06T12:00:00Z" },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ update })) };

    await expect(setClientTaskStatus(client, "task-1", "concluida")).resolves.toEqual({
      id: "task-1", status: "concluida", completedAt: "2026-09-06T12:00:00Z",
    });
    expect(update).toHaveBeenCalledWith({ status: "concluida" });
  });

  it("returns a neutral failure", async () => {
    const client = {
      from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: {} }) }) }) }) }),
    };
    await expect(setClientTaskStatus(client, "task-1", "pendente")).rejects.toThrow("Não foi possível atualizar esta tarefa.");
  });
});
```

Create `tests/components/client-checklist.test.tsx` with a browser Supabase client mock and these exact assertions:

```tsx
render(<ClientChecklist tasks={[actionableTask, readOnlyTask]} />);
expect(screen.getByLabelText(`Status de ${actionableTask.title}`)).toBeEnabled();
expect(screen.queryByLabelText(`Status de ${readOnlyTask.title}`)).not.toBeInTheDocument();
expect(screen.getByText("Acompanhada pelo estúdio")).toBeInTheDocument();
```

Then change the actionable select to `concluida`, assert the updater receives only the task ID/status, and assert `router.refresh()` runs on success. On rejected mutation, assert a `role="alert"` message appears and refresh does not run.

- [ ] **Step 2: Confirm RED**

Run: `npm run test -- tests/domain/client-checklist.test.ts tests/components/client-checklist.test.tsx`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the browser-safe checklist mutation**

Create `domain/portal/checklist.ts`:

```ts
export type ClientTaskStatus = "pendente" | "em_andamento" | "concluida";

type UpdateChain = {
  from(table: "preparation_tasks"): {
    update(values: { status: ClientTaskStatus }): {
      eq(column: "id", value: string): {
        select(columns: "id,status,completed_at"): {
          single(): Promise<{
            data: { id: string; status: ClientTaskStatus; completed_at: string | null } | null;
            error: unknown;
          }>;
        };
      };
    };
  };
};

export async function setClientTaskStatus(
  client: UpdateChain,
  taskId: string,
  status: ClientTaskStatus
) {
  const { data, error } = await client
    .from("preparation_tasks")
    .update({ status })
    .eq("id", taskId)
    .select("id,status,completed_at")
    .single();
  if (error || !data) throw new Error("Não foi possível atualizar esta tarefa.");
  return { id: data.id, status: data.status, completedAt: data.completed_at };
}
```

The structural interface keeps unit tests honest without importing a server-only module or using `any`; a real Supabase client satisfies it.

- [ ] **Step 4: Implement the client checklist UI and page**

Create `components/client/client-checklist.tsx` as a Client Component. Props are `{ tasks: PortalTask[] }`. Create the browser client inside the component with `useMemo(createSupabaseBrowserClient, [])`. For each task:

- show title, due date when non-null, and a Portuguese status label;
- if `clientActionable`, render a `<Select aria-label={`Status de ${task.title}`}>` with the three values;
- otherwise render `Acompanhada pelo estúdio` and no form control;
- disable all status controls while the selected mutation is pending;
- call `setClientTaskStatus`, then `router.refresh()`;
- render the neutral thrown message with `role="alert"`.

Use the exact status labels:

```ts
const STATUS_LABEL = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
} as const;
```

Create `app/(client)/minha-experiencia/checklist/page.tsx`:

```tsx
import { ClientChecklist } from "@/components/client/client-checklist";
import { readPortalSnapshot } from "@/domain/portal/read";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientChecklistPage() {
  const snapshot = await readPortalSnapshot(await createSupabaseServerClient());
  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">Preparação</p>
        <h1 className="font-serif text-4xl font-light">Seu checklist</h1>
      </div>
      <ClientChecklist tasks={snapshot.tasks} />
    </section>
  );
}
```

- [ ] **Step 5: Extend the Admin preparation controls**

Pass `clientActionable` from the Admin preparation page into its `Checklist` task objects. Extend the local `Task` type and display copy so every row distinguishes `interno`, `visível somente`, and `editável pela cliente`.

In the add-task form, add:

```tsx
<label className="flex items-center gap-2 font-sans text-sm text-ink">
  <input type="checkbox" name="visibleToClient" defaultChecked />
  Visível para a cliente
</label>
<label className="flex items-center gap-2 font-sans text-sm text-ink">
  <input type="checkbox" name="clientActionable" />
  A cliente pode alterar o status
</label>
```

Pass both names in `toFormAction(addPreparationTaskAction, { booleans: ["visibleToClient", "clientActionable"] })`. Zod rejects an actionable hidden task at the authoritative action boundary.

- [ ] **Step 6: Extend the live RLS test**

In `tests/domain/portal-rls.integration.test.ts`, insert one actionable visible task, one read-only visible task, and one hidden task for user A. Through user A's authenticated Supabase client:

```ts
const allowed = await firstSupabase
  .from("preparation_tasks")
  .update({ status: "concluida" })
  .eq("id", actionableTaskId)
  .select("id,status,completed_at")
  .single();
expect(allowed.error).toBeNull();
expect(allowed.data?.status).toBe("concluida");
expect(allowed.data?.completed_at).not.toBeNull();

const denied = await firstSupabase
  .from("preparation_tasks")
  .update({ status: "concluida" })
  .eq("id", readOnlyTaskId)
  .select("id");
expect(denied.data).toEqual([]);
```

Also attempt user B against user A's actionable ID and assert no row is returned. Re-read through Drizzle to prove the denied rows stayed unchanged.

- [ ] **Step 7: Verify, update SCL-303, and commit**

Run:

```bash
npm run test -- tests/domain/client-checklist.test.ts tests/components/client-checklist.test.tsx
$env:RUN_LIVE_DB_TESTS='true'; npm run test -- tests/domain/portal-rls.integration.test.ts
npm run typecheck
npm run lint
npm run check:admin-auth
```

Expected: all pass; live test proves actionable, read-only, hidden, and cross-client cases. Clear the environment flag afterward.

Mark SCL-303 DONE in `docs/TASKS.md`.

```bash
git add domain/portal/checklist.ts components/client/client-checklist.tsx "app/(client)/minha-experiencia/checklist/page.tsx" "app/admin/(protected)/agenda/[id]/preparacao/page.tsx" "app/admin/(protected)/agenda/[id]/preparacao/checklist.tsx" tests/domain/client-checklist.test.ts tests/components/client-checklist.test.tsx tests/domain/portal-rls.integration.test.ts docs/TASKS.md
git commit -m "SCL-303: let clients complete actionable tasks"
```

---

### Task 7: SCL-304 — Meu Ensaio, client-safe logistics, and Shoot+Payment composition

**Files:**
- Create: `components/client/my-shoot.tsx`
- Create: `app/(client)/minha-experiencia/ensaio/page.tsx`
- Modify: `app/admin/(protected)/agenda/novo/new-shoot-form.tsx`
- Modify: `app/admin/(protected)/agenda/[id]/edit-shoot-panel.tsx`
- Modify: `app/admin/(protected)/agenda/[id]/page.tsx`
- Modify: `.env.example`
- Modify: `docs/runbooks/supabase-setup.md`
- Test: `tests/components/my-shoot.test.tsx`
- Test: `tests/domain/portal-shoot-payment.integration.test.ts`
- Modify: `tests/lib/supabase-env.test.ts`
- Modify: `docs/TASKS.md`

**Interfaces:**
- Consumes: `PortalSnapshot`, `summarizePortalMoney`, safe Shoot fields from Task 2, existing `createShootAction`/`updateShootAction`.
- Produces: client-safe shoot detail and contact CTA; Admin inputs for location/guidance; deferred Shoot+Payment composition integration evidence.

- [ ] **Step 1: Write failing detail and environment tests**

Create `tests/components/my-shoot.test.tsx` using the populated Task 5 snapshot and assert:

```tsx
render(<MyShoot snapshot={snapshot} contactUrl="https://wa.me/5592999999999" />);
expect(screen.getByRole("heading", { name: "Meu ensaio" })).toBeInTheDocument();
expect(screen.getByText("Aurora")).toBeInTheDocument();
expect(screen.getByText("R$ 1.000,00")).toBeInTheDocument();
expect(screen.getByText("R$ 250,00")).toBeInTheDocument();
expect(screen.getByText("R$ 750,00")).toBeInTheDocument();
expect(screen.getByRole("link", { name: "Falar com o estúdio" })).toHaveAttribute("href", "https://wa.me/5592999999999");
expect(screen.queryByText(/comprovante|observações internas/i)).not.toBeInTheDocument();
```

Add a second test with null logistics and no contact URL; assert `Confirme com o estúdio` appears and no contact link is rendered.

Append to `tests/lib/supabase-env.test.ts`:

```ts
expect(envExample).toContain("NEXT_PUBLIC_STUDIO_WHATSAPP_URL");
```

- [ ] **Step 2: Confirm RED**

Run: `npm run test -- tests/components/my-shoot.test.tsx tests/lib/supabase-env.test.ts`

Expected: FAIL because the component and env entry do not exist.

- [ ] **Step 3: Implement Meu Ensaio**

Create `components/client/my-shoot.tsx`. For a non-null shoot/experience, derive money with:

```ts
const money = summarizePortalMoney(snapshot.shoot.agreedPrice, snapshot.payments);
```

Render semantic sections for `Data e horário`, `Sua experiência`, `Local e orientações`, and `Financeiro`. Use `formatShootDate`, `formatBRL`, and `getJourney`. The financial rows are exactly `Valor contratado`, `Pago`, `Saldo`, and `Status`; map statuses with:

```ts
const PAYMENT_LABEL = {
  nao_iniciado: "Pagamento pendente",
  parcial: "Pagamento parcial",
  pago: "Pagamento concluído",
} as const;
```

If `contactUrl` is defined, render an external link with `rel="noreferrer"`; otherwise render plain copy telling the client to use the usual studio contact. Do not accept or render Payment notes/proof fields in props.

Create `app/(client)/minha-experiencia/ensaio/page.tsx`:

```tsx
import { MyShoot } from "@/components/client/my-shoot";
import { readPortalSnapshot } from "@/domain/portal/read";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MyShootPage() {
  const snapshot = await readPortalSnapshot(await createSupabaseServerClient());
  return <MyShoot snapshot={snapshot} contactUrl={process.env.NEXT_PUBLIC_STUDIO_WHATSAPP_URL} />;
}
```

- [ ] **Step 4: Add logistics to Admin create/edit without exposing internal notes**

In both Admin shoot forms, add three fields with exact names `locationName`, `locationAddress`, `clientGuidance`; use `Input`, `Input`, and `Textarea`. In `EditShootPanel.initialValues`, add the three strings and pass them from the shoot detail page. In the Admin detail section, render location and address separately from internal `notes`.

Use exact labels:

```tsx
<Field label="Local" htmlFor="locationName"><Input id="locationName" name="locationName" /></Field>
<Field label="Endereço / ponto de encontro" htmlFor="locationAddress"><Input id="locationAddress" name="locationAddress" /></Field>
<Field label="Orientações para a cliente" htmlFor="clientGuidance"><Textarea id="clientGuidance" name="clientGuidance" /></Field>
```

On the edit form, include `defaultValue` from `initialValues`. No nullable-clearing refactor is added in this task: the established `toFormAction` behavior remains documented, and a blank optional field stays unchanged.

- [ ] **Step 5: Document the WhatsApp environment contract**

Add to `.env.example`:

```dotenv
# Public WhatsApp CTA used by Minha Experiência (full https://wa.me/... URL).
NEXT_PUBLIC_STUDIO_WHATSAPP_URL=
```

Add the same variable and expected format to `docs/runbooks/supabase-setup.md` and the Vercel environment checklist it references.

- [ ] **Step 6: Add the deferred live Shoot+Payment composition test**

Create `tests/domain/portal-shoot-payment.integration.test.ts` under `describeIfLiveDb`. Create an Auth user/client, a portal-enabled confirmed shoot with `agreedPrice: "1000.00"`, then call `registerPayment` twice: confirmed `"250.00"` and pending `"100.00"`. Sign in as the client and call `readPortalSnapshot`.

Assert:

```ts
expect(snapshot.shoot?.id).toBe(createdShootId);
expect(snapshot.payments.map((payment) => payment.amount)).toEqual(["250.00"]);
expect(summarizePortalMoney(snapshot.shoot!.agreedPrice, snapshot.payments)).toEqual({
  agreed: "1000.00",
  paid: "250.00",
  balance: "750.00",
  status: "parcial",
});
```

Cleanup the two payment rows, starter tasks, production job, shoot, client, and Auth user in FK order under `finally`/`afterAll`.

- [ ] **Step 7: Verify, update SCL-304, and commit**

Run:

```bash
npm run test -- tests/components/my-shoot.test.tsx tests/lib/supabase-env.test.ts
$env:RUN_LIVE_DB_TESTS='true'; npm run test -- tests/domain/portal-shoot-payment.integration.test.ts
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all checks pass and the live composition returns only the confirmed payment. Clear the environment flag afterward. Mark SCL-304 DONE with evidence in `docs/TASKS.md`.

```bash
git add components/client/my-shoot.tsx "app/(client)/minha-experiencia/ensaio/page.tsx" "app/admin/(protected)/agenda/novo/new-shoot-form.tsx" "app/admin/(protected)/agenda/[id]/edit-shoot-panel.tsx" "app/admin/(protected)/agenda/[id]/page.tsx" .env.example docs/runbooks/supabase-setup.md tests/components/my-shoot.test.tsx tests/domain/portal-shoot-payment.integration.test.ts tests/lib/supabase-env.test.ts docs/TASKS.md
git commit -m "SCL-304: connect client shoot and payment details"
```

---

### Task 8: SCL-305A — Styling schema, private bucket, grants, and policies

**Files:**
- Create: `db/schema/styling-references.ts`
- Modify: `db/schema/index.ts`
- Create: `domain/styling/schema.ts`
- Create: `db/migrations/0026_styling_references.sql` (generated)
- Create: `db/migrations/0027_styling_storage_access.sql` (custom SQL)
- Modify: `db/migrations/meta/_journal.json`
- Create: `tests/domain/styling-schema.test.ts`
- Create: `tests/db/styling-migrations.test.ts`

**Interfaces:**
- Produces: `stylingReferenceOriginEnum`; `stylingReferences`; `createStylingReferenceSchema`; private `styling-references` bucket; DB/Storage client and staff policies; 20-row guard.
- Consumed by: Task 9 client and Admin styling boards.

- [ ] **Step 1: Write failing styling schema tests**

Create `tests/domain/styling-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createStylingReferenceSchema, validateStylingFile } from "@/domain/styling/schema";

const SHOOT_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";

describe("styling reference schema", () => {
  it("accepts a client reference", () => {
    expect(createStylingReferenceSchema.parse({
      shootId: SHOOT_ID,
      storagePath: `${USER_ID}/${SHOOT_ID}/ref.webp`,
      caption: "Movimento e tons claros",
      origin: "client",
      uploadedByAuthUserId: USER_ID,
    })).toMatchObject({ origin: "client" });
  });

  it("limits captions to 500 characters", () => {
    expect(() => createStylingReferenceSchema.parse({
      shootId: SHOOT_ID,
      storagePath: `${USER_ID}/${SHOOT_ID}/ref.webp`,
      caption: "x".repeat(501),
      origin: "client",
      uploadedByAuthUserId: USER_ID,
    })).toThrow();
  });

  it("accepts only JPEG, PNG, or WebP up to 8 MB", () => {
    expect(validateStylingFile({ type: "image/webp", size: 8 * 1024 * 1024 })).toBeNull();
    expect(validateStylingFile({ type: "image/gif", size: 100 })).toMatch(/JPG, PNG ou WebP/);
    expect(validateStylingFile({ type: "image/jpeg", size: 8 * 1024 * 1024 + 1 })).toMatch(/8 MB/);
  });
});
```

- [ ] **Step 2: Confirm RED**

Run: `npm run test -- tests/domain/styling-schema.test.ts`

Expected: FAIL because the styling module does not exist.

- [ ] **Step 3: Add the Drizzle schema and validation**

Create `db/schema/styling-references.ts`:

```ts
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const stylingReferenceOriginEnum = pgEnum("styling_reference_origin", ["client", "studio"]);

export const stylingReferences = pgTable("styling_references", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootId: uuid("shoot_id").notNull(),
  storagePath: text("storage_path").notNull().unique(),
  caption: text("caption"),
  origin: stylingReferenceOriginEnum("origin").notNull(),
  uploadedByAuthUserId: uuid("uploaded_by_auth_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export type StylingReference = typeof stylingReferences.$inferSelect;
export type NewStylingReference = typeof stylingReferences.$inferInsert;
```

Export it from `db/schema/index.ts`.

Create `domain/styling/schema.ts`:

```ts
import { z } from "zod";

export const STYLING_BUCKET = "styling-references";
export const MAX_STYLING_REFERENCES = 20;
export const MAX_STYLING_FILE_BYTES = 8 * 1024 * 1024;
export const STYLING_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const createStylingReferenceSchema = z.object({
  shootId: z.string().uuid(),
  storagePath: z.string().min(1).max(500),
  caption: z.string().trim().max(500).optional(),
  origin: z.enum(["client", "studio"]),
  uploadedByAuthUserId: z.string().uuid().nullable(),
});

export function validateStylingFile(file: { type: string; size: number }): string | null {
  if (!(STYLING_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Envie uma imagem JPG, PNG ou WebP.";
  }
  if (file.size > MAX_STYLING_FILE_BYTES) return "A imagem deve ter no máximo 8 MB.";
  return null;
}
```

- [ ] **Step 4: Confirm GREEN and generate named migrations**

Run:

```bash
npm run test -- tests/domain/styling-schema.test.ts
npm run db:generate -- --name styling_references
npm run db:generate -- --custom --name styling_storage_access
```

Expected: test PASS; exact files `0026_styling_references.sql`, `0027_styling_storage_access.sql`, snapshot `0026_snapshot.json`, and journal entries 26/27. Inspect `0026`: it creates only the enum/table/unique constraint, with no duplicate FK or index.

- [ ] **Step 5: Add FKs, row limit, grants, RLS, bucket, and Storage policies**

Replace the empty `0027_styling_storage_access.sql` with:

```sql
alter table public.styling_references
  add constraint styling_references_shoot_id_fkey
  foreign key (shoot_id) references public.shoots(id) on delete cascade;
--> statement-breakpoint
alter table public.styling_references
  add constraint styling_references_uploaded_by_auth_user_id_fkey
  foreign key (uploaded_by_auth_user_id) references auth.users(id) on delete set null;
--> statement-breakpoint
alter table public.styling_references
  add constraint styling_references_caption_length check (char_length(caption) <= 500);
--> statement-breakpoint
create index styling_references_shoot_created_idx
  on public.styling_references (shoot_id, created_at);
--> statement-breakpoint

create or replace function public.enforce_styling_reference_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.shoot_id::text, 0));
  if (select count(*) from public.styling_references where shoot_id = new.shoot_id) >= 20 then
    raise exception 'styling reference limit reached' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger styling_references_limit
before insert on public.styling_references
for each row execute function public.enforce_styling_reference_limit();
--> statement-breakpoint

alter table public.styling_references enable row level security;
grant usage on type public.styling_reference_origin to authenticated;
grant select (id, shoot_id, storage_path, caption, origin, uploaded_by_auth_user_id, created_at)
  on table public.styling_references to authenticated;
grant insert (shoot_id, storage_path, caption, origin, uploaded_by_auth_user_id)
  on table public.styling_references to authenticated;
grant delete on table public.styling_references to authenticated;
--> statement-breakpoint

create policy styling_references_staff_access on public.styling_references
for all to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());
--> statement-breakpoint
create policy styling_references_client_read on public.styling_references
for select to authenticated
using (public.owns_portal_shoot(shoot_id));
--> statement-breakpoint
create policy styling_references_client_insert on public.styling_references
for insert to authenticated
with check (
  public.owns_portal_shoot(shoot_id)
  and origin = 'client'
  and uploaded_by_auth_user_id = auth.uid()
);
--> statement-breakpoint
create policy styling_references_client_delete on public.styling_references
for delete to authenticated
using (
  public.owns_portal_shoot(shoot_id)
  and uploaded_by_auth_user_id = auth.uid()
);
--> statement-breakpoint

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'styling-references', 'styling-references', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
--> statement-breakpoint

create or replace function public.owns_styling_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_shoot_id uuid;
begin
  target_shoot_id := split_part(object_name, '/', 2)::uuid;
  return public.owns_portal_shoot(target_shoot_id);
exception when invalid_text_representation then
  return false;
end;
$$;
--> statement-breakpoint
revoke all on function public.owns_styling_object(text) from public;
grant execute on function public.owns_styling_object(text) to authenticated;
--> statement-breakpoint

create policy styling_objects_client_read on storage.objects
for select to authenticated
using (bucket_id = 'styling-references' and public.owns_styling_object(name));
--> statement-breakpoint
create policy styling_objects_client_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'styling-references'
  and split_part(name, '/', 1) = auth.uid()::text
  and public.owns_styling_object(name)
);
--> statement-breakpoint
create policy styling_objects_client_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'styling-references'
  and split_part(name, '/', 1) = auth.uid()::text
  and public.owns_styling_object(name)
);
--> statement-breakpoint
create policy styling_objects_staff_access on storage.objects
for all to authenticated
using (bucket_id = 'styling-references' and public.is_staff_or_admin())
with check (bucket_id = 'styling-references' and public.is_staff_or_admin());
```

Check the current Supabase Storage policy syntax against official docs before applying. If `storage.buckets` rejects `ON CONFLICT DO UPDATE` under the migration owner, stop and report the exact error rather than creating the bucket manually without recording the divergence.

- [ ] **Step 6: Add static SQL contract tests**

Create `tests/db/styling-migrations.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(path.resolve("db/migrations/0027_styling_storage_access.sql"), "utf8");

describe("styling migrations", () => {
  it("creates a private, restricted 8 MB bucket", () => {
    expect(sql).toContain("'styling-references', 'styling-references', false, 8388608");
    expect(sql).toContain("array['image/jpeg', 'image/png', 'image/webp']");
  });
  it("enforces ownership for rows and object paths", () => {
    expect(sql).toContain("public.owns_portal_shoot(shoot_id)");
    expect(sql).toContain("split_part(name, '/', 1) = auth.uid()::text");
    expect(sql).toContain("uploaded_by_auth_user_id = auth.uid()");
  });
  it("enforces the 20-reference limit in the database", () => {
    expect(sql).toContain("styling_references_limit");
    expect(sql).toContain(">= 20");
  });
});
```

- [ ] **Step 7: Apply and inspect the live schema**

Run:

```bash
npm run test -- tests/domain/styling-schema.test.ts tests/db/styling-migrations.test.ts
npm run predb:migrate
npm run db:migrate
```

Expected: PASS. Query and record: six table columns plus timestamps/FKs/unique/check/index/trigger; `relrowsecurity = true`; six table/storage policies; private bucket MIME/size config; journal entries 26/27.

- [ ] **Step 8: Run task gate and commit**

Run: `npm run test && npm run typecheck && npm run lint`

Expected: all pass.

```bash
git add db/schema/styling-references.ts db/schema/index.ts db/migrations/ domain/styling/schema.ts tests/domain/styling-schema.test.ts tests/db/styling-migrations.test.ts
git commit -m "SCL-305: add private styling reference storage"
```

---

### Task 9: SCL-305B — Collaborative client and Admin styling boards

**Files:**
- Create: `domain/styling/client.ts`
- Create: `domain/styling/read.ts`
- Modify: `domain/portal/types.ts`
- Modify: `domain/portal/read.ts`
- Create: `components/client/styling-board.tsx`
- Create: `app/(client)/minha-experiencia/styling/page.tsx`
- Create: `components/admin/styling-manager.tsx`
- Modify: `app/admin/(protected)/agenda/[id]/page.tsx`
- Test: `tests/domain/styling-client.test.ts`
- Test: `tests/components/styling-board.test.tsx`
- Create: `tests/domain/styling-storage.integration.test.ts`
- Modify: `docs/TASKS.md`

**Interfaces:**
- Consumes: Task 8 table/bucket/policies and authenticated Supabase clients.
- Produces: `PortalReference`; `readStylingReferences`; signed private reference reads; upload compensation; owner-only client deletion; staff management surface.

- [ ] **Step 1: Write failing upload validation/compensation tests**

Create `tests/domain/styling-client.test.ts` with a fake storage/table client. Assert:

```ts
await expect(uploadStylingReference(client, {
  file: new File(["x"], "ref.gif", { type: "image/gif" }),
  shootId: SHOOT_ID,
  authUserId: USER_ID,
  caption: "Teste",
  origin: "client",
  currentCount: 0,
})).rejects.toThrow("JPG, PNG ou WebP");

await expect(uploadStylingReference(client, {
  file: validFile,
  shootId: SHOOT_ID,
  authUserId: USER_ID,
  caption: "Teste",
  origin: "client",
  currentCount: 20,
})).rejects.toThrow("20 referências");
```

For an upload success followed by row-insert failure, assert `storage.from(STYLING_BUCKET).remove([createdPath])` is called exactly once. For full success, assert the inserted row has `origin: "client"`, current Auth user ID, Shoot ID, and no public URL.

- [ ] **Step 2: Confirm RED**

Run: `npm run test -- tests/domain/styling-client.test.ts`

Expected: FAIL because the client module does not exist.

- [ ] **Step 3: Implement upload and delete operations**

Create `domain/styling/client.ts` with browser-safe functions. Use `validateStylingFile`, `MAX_STYLING_REFERENCES`, and `STYLING_BUCKET`. Derive the safe extension from MIME, never from the original filename:

```ts
const EXTENSION = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
const path = `${authUserId}/${shootId}/${crypto.randomUUID()}.${EXTENSION[file.type as keyof typeof EXTENSION]}`;
```

`uploadStylingReference` performs:

```ts
if (currentCount >= MAX_STYLING_REFERENCES) throw new Error("Este ensaio já possui 20 referências.");
const validation = validateStylingFile(file);
if (validation) throw new Error(validation);
const upload = await supabase.storage.from(STYLING_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
if (upload.error) throw new Error("Não foi possível enviar esta referência.");
const inserted = await supabase.from("styling_references").insert({
  shoot_id: shootId,
  storage_path: path,
  caption: caption.trim() || null,
  origin,
  uploaded_by_auth_user_id: authUserId,
}).select("id,shoot_id,storage_path,caption,origin,uploaded_by_auth_user_id,created_at").single();
if (inserted.error || !inserted.data) {
  await supabase.storage.from(STYLING_BUCKET).remove([path]);
  throw new Error("Não foi possível salvar esta referência.");
}
return inserted.data;
```

`deleteStylingReference` deletes the table row by ID with `.select("storage_path").single()`, then removes the returned object path. If the row delete is denied, do not attempt Storage deletion. If object removal fails after row deletion, throw a neutral error and log in the calling UI/Sentry; do not recreate a broken row.

Define narrow structural client interfaces for the test doubles; do not use `any` or import server-only code.

- [ ] **Step 4: Extend the shared read model with private signed images**

Add to `domain/portal/types.ts`:

```ts
export type PortalReference = {
  id: string;
  shootId: string;
  storagePath: string;
  signedUrl: string;
  caption: string | null;
  origin: "client" | "studio";
  uploadedByAuthUserId: string | null;
  createdAt: string;
};
```

Add `viewerAuthUserId: string` and `references: PortalReference[]` to `PortalSnapshot`. Update every existing snapshot fixture to include the viewer ID and `references: []`.

Create `domain/styling/read.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortalReference } from "@/domain/portal/types";
import { STYLING_BUCKET } from "./schema";

export async function readStylingReferences(
  supabase: SupabaseClient,
  shootId: string
): Promise<PortalReference[]> {
  const rows = await supabase
    .from("styling_references")
    .select("id,shoot_id,storage_path,caption,origin,uploaded_by_auth_user_id,created_at")
    .eq("shoot_id", shootId)
    .order("created_at", { ascending: true });
  if (rows.error) throw new Error("styling references unavailable", { cause: rows.error });
  const paths = (rows.data ?? []).map((row) => row.storage_path);
  if (paths.length === 0) return [];
  const signed = await supabase.storage.from(STYLING_BUCKET).createSignedUrls(paths, 3600);
  if (signed.error || !signed.data || signed.data.length !== paths.length) {
    throw new Error("styling references unavailable", { cause: signed.error });
  }
  return (rows.data ?? []).map((row, index) => ({
    id: row.id,
    shootId: row.shoot_id,
    storagePath: row.storage_path,
    signedUrl: signed.data[index].signedUrl,
    caption: row.caption,
    origin: row.origin,
    uploadedByAuthUserId: row.uploaded_by_auth_user_id,
    createdAt: row.created_at,
  })) as PortalReference[];
}
```

In `readPortalSnapshot`, call `readStylingReferences(supabase, shoot.id)` alongside the package/task/payment reads and return its result. Wrap its failure in `PortalReadError("query_failed", cause)`. Return no public URL and never cache signed URLs beyond the render.

- [ ] **Step 5: Write and implement the client styling board**

Create `tests/components/styling-board.test.tsx`. Assert empty-state copy, accepted file input types, visible 8 MB/20-image guidance, owner-only remove buttons, no remove control for `origin: "studio"` or another uploader, pending disablement, and neutral upload error.

Create `components/client/styling-board.tsx` as a Client Component with props:

```ts
{
  shootId: string;
  viewerAuthUserId: string;
  references: PortalReference[];
  origin?: "client" | "studio";
  canDeleteAll?: boolean;
}
```

Render a responsive image grid using native `<img>` because private signed URLs are ephemeral and their Supabase host is not yet configured for `next/image`. Each image uses caption or `Referência de styling` as alt. The form contains one file input:

```tsx
<input
  id="stylingFile"
  name="stylingFile"
  type="file"
  accept="image/jpeg,image/png,image/webp"
  required
/>
```

and one optional 500-character caption. On submit, call `uploadStylingReference`; on delete, call `deleteStylingReference`; on success, reset the form and `router.refresh()`. A client sees delete only when `reference.uploadedByAuthUserId === viewerAuthUserId`; Admin with `canDeleteAll` sees it for all references. Use `role="status"` for pending/success and `role="alert"` for failure.

- [ ] **Step 6: Add client and Admin pages**

Create `app/(client)/minha-experiencia/styling/page.tsx`:

```tsx
import { StylingBoard } from "@/components/client/styling-board";
import { readPortalSnapshot } from "@/domain/portal/read";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientStylingPage() {
  const snapshot = await readPortalSnapshot(await createSupabaseServerClient());
  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">Inspirações</p>
        <h1 className="font-serif text-4xl font-light">Styling e referências</h1>
      </div>
      {snapshot.shoot ? (
        <StylingBoard shootId={snapshot.shoot.id} viewerAuthUserId={snapshot.viewerAuthUserId} references={snapshot.references} />
      ) : (
        <p className="font-sans text-sm text-muted">Seu espaço de styling aparecerá quando o ensaio for liberado.</p>
      )}
    </section>
  );
}
```

Create `components/admin/styling-manager.tsx`:

```tsx
import type { PortalReference } from "@/domain/portal/types";
import { StylingBoard } from "@/components/client/styling-board";

export function StylingManager(props: {
  shootId: string;
  viewerAuthUserId: string;
  references: PortalReference[];
}) {
  return <StylingBoard {...props} origin="studio" canDeleteAll />;
}
```

In the Admin shoot detail page, create one cookie-bound Supabase client, call `auth.getUser()`, and fail closed when it returns no user despite the protected layout. Call `readStylingReferences(supabase, id)`, then render:

```tsx
<DetailSection title="Styling e referências">
  <StylingManager
    shootId={id}
    viewerAuthUserId={authUser.id}
    references={stylingReferences}
  />
</DetailSection>
```

Do not route Admin styling through the client-owned `readPortalSnapshot`, because staff is not linked through `clients.auth_user_id`.

- [ ] **Step 7: Add live Storage/RLS integration**

Create `tests/domain/styling-storage.integration.test.ts` using the two-user fixture pattern. As user A:

1. upload a small in-memory WebP-signature test blob to `A_USER_ID/A_SHOOT_ID/<uuid>.webp`;
2. insert a `styling_references` row;
3. create a signed URL and assert success;
4. as user B, select user A's row and assert `[]`;
5. as user B, attempt to remove user A's object and assert an error;
6. as user A, delete the row/object and assert success.

Also create 20 table rows with unique paths through the privileged fixture connection, then attempt the 21st insert and assert PostgreSQL check violation. Delete all test rows/objects and Auth users even after assertion failure.

- [ ] **Step 8: Verify, update SCL-305, and commit**

Run:

```bash
npm run test -- tests/domain/styling-client.test.ts tests/components/styling-board.test.tsx
$env:RUN_LIVE_DB_TESTS='true'; npm run test -- tests/domain/styling-storage.integration.test.ts tests/domain/portal-rls.integration.test.ts
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
```

Expected: all pass; live tests prove private access, cross-client denial, owner deletion, and the 20-row database guard. Clear the environment flag. Mark SCL-305 DONE with bucket limits and policy evidence in `docs/TASKS.md`.

```bash
git add domain/styling/client.ts domain/styling/read.ts domain/portal/types.ts domain/portal/read.ts components/client/styling-board.tsx "app/(client)/minha-experiencia/styling/page.tsx" components/admin/styling-manager.tsx "app/admin/(protected)/agenda/[id]/page.tsx" tests/domain/styling-client.test.ts tests/components/styling-board.test.tsx tests/domain/styling-storage.integration.test.ts tests/domain/portal-rls.integration.test.ts docs/TASKS.md
git commit -m "SCL-305: add collaborative styling boards"
```

---

### Task 10: Epic 3 close-out — security trace, mobile acceptance, docs, and final review

**Files:**
- Modify: `docs/TASKS.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/runbooks/supabase-setup.md`
- Modify: `.superpowers/sdd/progress.md` (gitignored execution log)
- Review: all files changed since commit `a2d0f40`

**Interfaces:**
- Consumes: every Epic 3 task and migration.
- Produces: durable close-out evidence, zero leftover live fixtures, green repository, CI/deploy-ready `main`.

- [ ] **Step 1: Reconcile the board and architecture record**

In `docs/TASKS.md`, ensure SCL-300–SCL-305 each have a detailed section matching the established template: DONE, owner, dependencies, exact files, migrations, acceptance criteria checked, implementation notes, verification commands/results, live evidence, and next step.

Append `2026-09-06 — Epic 3 (Minha Experiência) encerrado` to `docs/DECISIONS.md` recording:

- hybrid Supabase JWT/RLS client data path versus privileged Admin Drizzle path;
- exact active-shoot selection order;
- `client_actionable` plus DB-owned completion timestamp invariant;
- safe Shoot logistics columns instead of exposing internal notes;
- private Supabase Storage choice and 8 MB/20-reference limits;
- remaining no-dedicated-test-DB risk;
- Reveal/gallery and full-resolution asset storage still deferred.

- [ ] **Step 2: Run the complete non-live gate**

Run in separate commands so failures remain attributable:

```bash
npm run test
npm run typecheck
npm run lint
npm run check:admin-auth
npm run build
git diff --check
```

Expected: every command exits 0. Record exact passed/skipped counts and build routes in `.superpowers/sdd/progress.md` and each affected task section.

- [ ] **Step 3: Run the complete live integration gate once**

Run in PowerShell:

```powershell
$env:RUN_LIVE_DB_TESTS='true'
npm run test
Remove-Item Env:RUN_LIVE_DB_TESTS
```

Expected: zero failed/skipped live tests. Query the database and Storage after the run for the unique `Teste Epic3` fixture prefix and assert zero Client/Shoot/Payment/PreparationTask/StylingReference/Auth-user rows and zero matching Storage objects remain.

- [ ] **Step 4: Trace the PRD §23 acceptance path through code and live data**

Record a one-line source for each edge:

```text
Admin create → createShootAction → createConfirmedShoot transaction
Magic Link → auth callback → linkAuthUserToClient
Portal read → readPortalSnapshot → Supabase JWT → grants/RLS
Checklist write → setClientTaskStatus → RLS → completed_at trigger
Payment summary → confirmed Payment rows → summarizePortalMoney
Production/Shoot update → changeProductionJobStatus/changeShootStatusAction → portal Shoot read
Styling upload → private Storage object + styling_references row
```

If any edge cannot be traced to executable code and a passing assertion/manual check, reopen its owning task before review.

- [ ] **Step 5: Perform the manual browser acceptance walk**

With a disposable real client linked by email:

1. request and consume a Magic Link;
2. verify C+ home selects the nearest future active shoot;
3. verify 320 px and desktop layouts, keyboard focus, and no horizontal overflow;
4. complete an actionable task and verify Admin sees the same row/status;
5. verify a read-only task has no client control;
6. upload a valid WebP/JPEG reference, view its private signed image, and remove it;
7. verify a studio-origin reference is visible but not client-deletable;
8. verify Meu Ensaio displays correct logistics and confirmed-payment summary;
9. advance Shoot/production state in Admin, refresh the portal, and verify journey state changes;
10. verify logout and expired/invalid-link copy.

Capture screenshots of the mobile home, checklist, Meu Ensaio, and styling board for the task record without committing personal client data.

- [ ] **Step 6: Dispatch whole-epic review and fix wave**

Use one independent reviewer for spec compliance/security and a second for code quality/UX. Review the full diff `a2d0f40..HEAD`, with explicit focus on:

- cross-client access through guessed IDs;
- grants exposing internal columns despite RLS;
- security-definer `search_path` and recursion;
- checklist update of non-status columns;
- account-link race/ambiguity;
- Storage object/row orphan paths;
- private signed URL handling;
- 20-row concurrency guard;
- money/date boundary correctness;
- Client Components importing server-only graphs;
- Admin auth guard coverage and dead links.

Fix every Critical/Important finding, add regression tests, rerun the relevant focused/live gate, then ask both reviewers to re-review the fixes. Triage Minor findings into fix-now or a named durable follow-up; do not silently discard them.

- [ ] **Step 7: Final verification and close-out commit**

Repeat Step 2 after the fix wave. Confirm `git status --short` contains only intended changes. Commit the durable close-out docs and any reviewed fixes:

```bash
git add docs/TASKS.md docs/DECISIONS.md docs/runbooks/supabase-setup.md
git commit -m "SCL-300: close Epic 3 Minha Experiência"
```

Do not push until the user-facing close-out summary includes tests, live cleanup evidence, migrations, security review verdict, and manual screenshots. Then push `main`, watch GitHub Actions to green, and confirm the production Vercel deployment before declaring the epic complete.

---

## Plan Completion Checklist

- [ ] Every SCL-300–SCL-305 acceptance criterion maps to an implementation task and a verification step.
- [ ] Generated migrations are exactly `0024_epic3_client_fields.sql` and `0026_styling_references.sql`; custom migrations are exactly `0025_epic3_client_access.sql` and `0027_styling_storage_access.sql`.
- [ ] No task introduces a second source of truth for status, progress, balance, identity, or Storage URL.
- [ ] Client RLS is proven using two authenticated non-privileged Supabase sessions.
- [ ] Live fixtures include guaranteed cleanup and remain opt-in.
- [ ] The final push happens only after whole-epic review, fix wave, green CI, and production deploy confirmation.
