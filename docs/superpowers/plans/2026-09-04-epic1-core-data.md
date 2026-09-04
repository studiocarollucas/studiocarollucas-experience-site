# Epic 1 — Core de Dados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the eight core domain entities (ExperiencePackage, Client, Lead, Shoot, Payment/Expense, PreparationTask, ProductionJob, AuditLog) as Drizzle schemas with RLS backstops, Zod input validation, minimal create/read primitives, and the pure business-rule functions (status transitions, balance/financial-status derivation) the PRD explicitly calls out for unit testing — so Epic 2 (Studio OS admin UI) and Epic 3 (Minha Experiência) have a stable, tested contract to build on instead of guessing at shapes.

**Architecture:** Same monolith as P0 — one Drizzle schema file per table under `db/schema/`, one Zod validation module + minimal create/getById primitives per entity under `domain/<entity>/`, migrations applied directly against the now-live Supabase project (unlike P0, this project has a working `.env.local` and live database throughout this plan). Each table gets an RLS backstop (`enable row level security` + a staff/admin-full-access policy via a new `public.is_staff_or_admin()` helper, following the exact pattern `db/migrations/0001_profiles_rls.sql` established and `docs/DECISIONS.md`'s "RLS como defesa em profundidade" decision requires) — per that decision, RLS here is defense-in-depth, not the authoritative boundary; `lib/auth/rbac.ts` checks in Epic 2/3's routes/actions remain authoritative. Client-row-level RLS policies (a client seeing only their own Shoot) are explicitly deferred to Epic 3, when the client-facing read paths are actually built — Epic 1 only adds the `clients.auth_user_id` column those future policies will key off.

**Tech Stack:** Same as P0 — Drizzle ORM + drizzle-kit, Zod, Vitest, TypeScript strict, Supabase Postgres (live project, region Americas).

This plan covers `docs/TASKS.md`'s Epic 1 backlog: SCL-102, SCL-100, SCL-101, SCL-103, SCL-104, SCL-105, SCL-106, SCL-107 (SCL-108 "seeds de experiências" is folded into Task 1, ExperiencePackage, since seeding four rows into the table that task creates is a few lines, not a separate task). `docs/TASKS.md` is also missing a tracked SCL-101 row entirely — the final P0 review flagged this gap; Task 3 of this plan adds it.

## Global Constraints

- TypeScript strict mode maintained; no `any`.
- Zod for input validation (PRD §10.3) — every `create*` function validates its input through a Zod schema before touching the database.
- Migrations versioned in the repository; **never edit or renumber a migration once it has been applied** (PRD §19.7) — this plan runs against the live project, so once a migration in this plan is applied via `npm run db:migrate`, later tasks must add a new migration to fix anything, not edit an earlier one. Migrations remain editable only up to the moment `db:migrate` successfully applies them.
- Migrations are serialized — one task generates and applies its migration(s) before the next task starts (PRD §19.7). This plan's tasks are already ordered to respect entity dependencies (ExperiencePackage/Client have none; Lead needs Client; Shoot needs Client+ExperiencePackage; Payment/PreparationTask/ProductionJob need Shoot; AuditLog needs nothing but references `profiles`) — execute them in order, not in parallel.
- RLS on every new table (PRD §12, §10.4) — no table ships without `enable row level security` and at least one policy, even though the authoritative check is the app layer (`docs/DECISIONS.md`, 2026-09-03 entry).
- No financial rule lives only in the frontend (PRD §14) — balance and financial-status derivation are pure, independently-tested functions in `domain/payments/`, not inline JSX/component logic.
- Never expose the Supabase service role key to the browser (unchanged from P0 — nothing in this plan touches it; all writes go through `db/client.ts`'s `DATABASE_URL`/`postgres` role, per the C4 decision).
- Commit messages must include the Task ID in the exact form `SCL-XXX: message`.
- IDs are stable UUIDs, never derived from name/email (PRD §8).
- Status fields use fixed Postgres enums (`pgEnum`), matching the states the PRD lists verbatim — don't invent extra states, don't drop documented ones.
- `saldo`/financial status must be **derived**, never a second hand-entered source of truth (PRD §7.5) — see Task 5's design note on `shoots.payment_status` for how this plan reconciles that rule with `docs/reference/studio-carol-lucas-v2.3-modelo-dados.md`'s schema, which lists `payment_status` as a literal Shoot column.

---

### Task 1: SCL-102 — ExperiencePackage schema, seed data, and the `is_staff_or_admin()` RLS helper

**Files:**
- Create: `db/schema/experience-packages.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/000X_experience_packages.sql` (drizzle-kit generated, X = next free index, currently `3`)
- Create: `db/migrations/000Y_experience_packages_rls.sql` (hand-written, Y = X+1)
- Modify: `db/migrations/meta/_journal.json` (manual entry for the hand-written RLS migration, same pattern as `0001_profiles_rls`)
- Create: `db/seeds/experience-packages.ts`
- Create: `domain/catalog/experience-package.ts`
- Test: `tests/domain/experience-package.test.ts`

**Interfaces:**
- Consumes: `db` from `db/client.ts` (P0/Task 5), `is_admin()` pattern established in `db/migrations/0001_profiles_rls.sql` (P0/Task 7) as the template for the new `is_staff_or_admin()` helper.
- Produces: `experiencePackages` table + `ExperiencePackage`/`NewExperiencePackage` types exported from `db/schema/experience-packages.ts`; `createExperiencePackageSchema` (Zod) and `createExperiencePackage()`/`getExperiencePackageById()` from `domain/catalog/experience-package.ts` — the pattern every later task in this plan (and Epic 2's admin CRUD) copies; `public.is_staff_or_admin()` SQL function every later task's RLS migration in this plan uses.

- [ ] **Step 1: Write the Drizzle schema**

Create `db/schema/experience-packages.ts`:

```ts
import { pgTable, uuid, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const experiencePackages = pgTable("experience_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  includedPhotos: integer("included_photos").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  scenes: text("scenes"),
  makeIncluded: boolean("make_included").notNull().default(false),
  outfitsLimit: integer("outfits_limit"),
  clutchIncluded: boolean("clutch_included").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ExperiencePackage = typeof experiencePackages.$inferSelect;
export type NewExperiencePackage = typeof experiencePackages.$inferInsert;
```

Update `db/schema/index.ts`:

```ts
export * from "./profiles";
export * from "./experience-packages";
```

- [ ] **Step 2: Generate and inspect the migration**

```powershell
npm run db:generate
```

Expected: a new file `db/migrations/0003_<generated-name>.sql` (the exact generated name varies) containing `CREATE TABLE "experience_packages" (...)` matching every column above. Note its real filename before continuing — later steps refer to it as `000X_experience_packages.sql` for readability, but use the actual generated filename.

- [ ] **Step 3: Apply it against the live Supabase project**

```powershell
npm run db:migrate
```

Expected: exits 0, `experience_packages` table now visible in the Supabase Table Editor.

- [ ] **Step 4: Write the RLS helper + policy migration**

Check the next free index (should be `4` after Step 2/3, but confirm — `db/migrations/meta/_journal.json`'s last entry's `idx` plus one):

```powershell
Get-ChildItem db/migrations -Filter "*.sql" | Sort-Object Name
```

Create `db/migrations/0004_experience_packages_rls.sql` (adjust the leading number to match):

```sql
-- Generalizes public.is_admin() (0001_profiles_rls.sql) to also admit staff, since
-- Studio OS business tables (catalog, clients, shoots, ...) are staff+admin territory,
-- not admin-only. Same security-definer pattern: runs as the function owner (table
-- owner), which bypasses RLS by default, so this does not recurse into any policy
-- that calls it.
create or replace function public.is_staff_or_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;
--> statement-breakpoint

alter table "experience_packages" enable row level security;
--> statement-breakpoint

create policy "experience_packages_staff_access"
  on "experience_packages" for all
  using (public.is_staff_or_admin());
```

This is a **defense-in-depth backstop**, per `docs/DECISIONS.md`'s 2026-09-03 RLS decision — the authoritative check happens in Epic 2's admin routes/actions via `lib/auth/rbac.ts`'s `requireRole(user, "staff")`, not here. No client-row policy exists on this table because the public site will read the catalog through the app layer (Drizzle), not directly via a browser Supabase client, at least for the MVP scope this plan covers.

- [ ] **Step 5: Register the migration in the journal**

Read `db/migrations/meta/_journal.json`'s existing entries for the exact field shape (don't guess), then append an entry for this migration — `idx` one past the last generated migration's index (from Step 2), `tag` matching the filename without extension, `breakpoints: true`. Follow the exact pattern `0001_profiles_rls`'s entry already established.

- [ ] **Step 6: Apply the RLS migration**

```powershell
npm run db:migrate
```

Expected: exits 0. Verify in the Supabase dashboard (Table Editor → `experience_packages` → RLS, or Database → Functions) that `is_staff_or_admin()` exists and the policy is attached.

- [ ] **Step 7: Write the failing test for Zod validation**

Create `tests/domain/experience-package.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createExperiencePackageSchema } from "@/domain/catalog/experience-package";

describe("createExperiencePackageSchema", () => {
  it("accepts a valid package", () => {
    const result = createExperiencePackageSchema.safeParse({
      name: "Aurora",
      basePrice: "890.00",
      includedPhotos: 30,
      durationMinutes: 120,
      makeIncluded: true,
      clutchIncluded: false,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createExperiencePackageSchema.safeParse({
      name: "",
      basePrice: "890.00",
      includedPhotos: 30,
      durationMinutes: 120,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive includedPhotos", () => {
    const result = createExperiencePackageSchema.safeParse({
      name: "Aurora",
      basePrice: "890.00",
      includedPhotos: 0,
      durationMinutes: 120,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/catalog/experience-package` has no exports.

- [ ] **Step 9: Implement the domain module**

Create `domain/catalog/experience-package.ts`:

```ts
import { z } from "zod";
import { db } from "@/db/client";
import { experiencePackages, type ExperiencePackage } from "@/db/schema";
import { eq } from "drizzle-orm";

export const createExperiencePackageSchema = z.object({
  name: z.string().min(1),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "must be a decimal string like \"890.00\""),
  includedPhotos: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  scenes: z.string().optional(),
  makeIncluded: z.boolean().default(false),
  outfitsLimit: z.number().int().positive().optional(),
  clutchIncluded: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type CreateExperiencePackageInput = z.infer<typeof createExperiencePackageSchema>;

export async function createExperiencePackage(
  input: CreateExperiencePackageInput
): Promise<ExperiencePackage> {
  const parsed = createExperiencePackageSchema.parse(input);
  const [row] = await db.insert(experiencePackages).values(parsed).returning();
  return row;
}

export async function getExperiencePackageById(id: string): Promise<ExperiencePackage | null> {
  const [row] = await db
    .select()
    .from(experiencePackages)
    .where(eq(experiencePackages.id, id))
    .limit(1);
  return row ?? null;
}
```

(`basePrice` is validated/stored as a decimal string, matching Drizzle's `numeric` column type — `pg`/`postgres.js` returns `numeric` as a string to avoid float precision loss, and this plan keeps that convention through every money field rather than silently converting to `number`.)

- [ ] **Step 10: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 3 tests passed.

- [ ] **Step 11: Write and run the seed script**

Create `db/seeds/experience-packages.ts`:

```ts
import { db } from "@/db/client";
import { experiencePackages } from "@/db/schema";

const SEED_PACKAGES = [
  {
    name: "Cinderela",
    basePrice: "0.00",
    includedPhotos: 20,
    durationMinutes: 90,
    makeIncluded: true,
    clutchIncluded: false,
    active: true,
  },
  {
    name: "Bella",
    basePrice: "0.00",
    includedPhotos: 25,
    durationMinutes: 105,
    makeIncluded: true,
    clutchIncluded: true,
    active: true,
  },
  {
    name: "Aurora",
    basePrice: "0.00",
    includedPhotos: 30,
    durationMinutes: 120,
    makeIncluded: true,
    clutchIncluded: true,
    active: true,
  },
  {
    name: "Diana",
    basePrice: "0.00",
    includedPhotos: 35,
    durationMinutes: 150,
    makeIncluded: true,
    clutchIncluded: true,
    active: true,
  },
];

async function seed() {
  // basePrice is a placeholder (0.00) — real internal pricing must be entered via
  // Studio OS (Epic 2) before this catalog is used for anything financial. Seeding
  // real prices here would fabricate business data nobody has provided.
  await db.insert(experiencePackages).values(SEED_PACKAGES);
  console.log(`Seeded ${SEED_PACKAGES.length} experience packages (placeholder prices — update via Admin before launch).`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

Add a script to `package.json`:

```json
"db:seed:experiences": "node --env-file-if-exists=.env.local --experimental-strip-types db/seeds/experience-packages.ts"
```

Run it:

```powershell
npm run db:seed:experiences
```

Expected: `Seeded 4 experience packages...`. Verify in the Supabase Table Editor that `experience_packages` has exactly the 4 rows (Cinderela, Bella, Aurora, Diana), all `active = true`, `base_price = 0.00`.

If `--experimental-strip-types` isn't supported by the installed Node version (check `node --version`; this flag needs Node ≥22.6, unflagged since ≥23.6 — confirm empirically rather than assuming, same as P0's `--env-file-if-exists` check), drop the flag if unnecessary or report back with what actually worked.

- [ ] **Step 12: Run the full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all green.

- [ ] **Step 13: Commit**

```powershell
git add db/schema/experience-packages.ts db/schema/index.ts db/migrations/ db/seeds/experience-packages.ts domain/catalog/ tests/domain/experience-package.test.ts package.json package-lock.json
git commit -m "SCL-102: add ExperiencePackage schema, RLS helper, and seed catalog"
```

- [ ] **Step 14: Update `docs/TASKS.md`**

Add SCL-102's summary-table row (status `DONE`) and a detailed section following the same format as SCL-004–SCL-008, including this task's acceptance criteria (schema created, migration applied to the live project, RLS enabled, 4 packages seeded, Zod validation tested) and an Implementation notes entry recording that `is_staff_or_admin()` now exists for every later task in this plan to reuse. Also add the missing **SCL-108** summary-table row (status `DONE`, folded into this task) so the backlog reflects that seeding happened, even though there's no separate detailed section for it. Commit separately: `SCL-102: mark task DONE in docs/TASKS.md`.

---

### Task 2: SCL-100 — Client schema

**Files:**
- Create: `db/schema/clients.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/000X_clients.sql` (generated)
- Create: `db/migrations/000Y_clients_rls.sql` (hand-written)
- Modify: `db/migrations/meta/_journal.json`
- Create: `domain/clients/schema.ts`
- Create: `domain/clients/service.ts`
- Test: `tests/domain/clients.test.ts`

**Interfaces:**
- Consumes: `public.is_staff_or_admin()` (Task 1); `db` from `db/client.ts`.
- Produces: `clients` table + `Client`/`NewClient` types from `db/schema/clients.ts`; `createClientSchema` (Zod) and `createClient()`/`getClientById()` from `domain/clients/service.ts` — Task 3 (Lead) and Task 4 (Shoot) both FK into this table and import `Client` from here.

- [ ] **Step 1: Write the Drizzle schema**

Create `db/schema/clients.ts`:

```ts
import { pgTable, uuid, text, boolean, date, timestamp } from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Nullable + unique: a Client business record can exist before the person ever
  // logs in (e.g. Admin adds them from a phone call). This gets populated once
  // they have portal access, linking the CRM record to their Supabase Auth session.
  // References auth.users directly (not `profiles.id`) because that's the stable
  // Supabase-managed identity; `profiles` mirrors it 1:1 via the SCL-005 trigger.
  authUserId: uuid("auth_user_id").unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  instagramHandle: text("instagram_handle"),
  birthday: date("birthday"),
  source: text("source"),
  referrerClientId: uuid("referrer_client_id"),
  styleProfile: text("style_profile"),
  notes: text("notes"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
```

`referrerClientId` is deliberately left without a Drizzle `.references()` self-FK here — Drizzle can express self-referential FKs, but doing so requires care with the generated migration's statement order (the table must exist before its own FK constraint), and getting that wrong on a live project is exactly the kind of thing to verify carefully. Add the FK as a second, explicit statement inside this task's hand-written-adjacent step instead of trusting drizzle-kit's self-reference generation — see Step 2b.

Update `db/schema/index.ts`:

```ts
export * from "./profiles";
export * from "./experience-packages";
export * from "./clients";
```

- [ ] **Step 2: Generate the migration**

```powershell
npm run db:generate
```

Expected: a new `db/migrations/000X_<name>.sql` with `CREATE TABLE "clients" (...)` and a unique index on `auth_user_id`. Confirm it does NOT already contain a self-referential FK for `referrer_client_id` (it shouldn't, since the schema above has no `.references()` call) — if it does, stop and report, since that means drizzle-kit inferred something unexpected.

- [ ] **Step 2b: Add the self-referential FK as a follow-up hand-written statement**

Rather than fighting drizzle-kit's self-FK generation, add it explicitly in the same migration file drizzle-kit just generated, appended after the `CREATE TABLE`:

```sql
--> statement-breakpoint
alter table "clients"
  add constraint "clients_referrer_client_id_fkey"
  foreign key ("referrer_client_id") references "clients"("id");
```

This keeps referential integrity for indicações (PRD §7.2 "indicação") without relying on Drizzle's schema DSL to express a self-reference — a pattern worth recording in `docs/DECISIONS.md` if a later task hits the same need again.

- [ ] **Step 3: Apply against the live project**

```powershell
npm run db:migrate
```

Expected: exits 0. Verify `clients` in the Table Editor, and confirm the FK exists (`\d clients` via a SQL query, or the dashboard's constraint view).

- [ ] **Step 4: Write the RLS migration**

Check the next free index, then create `db/migrations/000Y_clients_rls.sql`:

```sql
alter table "clients" enable row level security;
--> statement-breakpoint

create policy "clients_staff_access"
  on "clients" for all
  using (public.is_staff_or_admin());
--> statement-breakpoint

-- Deferred to Epic 3: a client reading their own row via
-- `auth_user_id = auth.uid()`. Not added yet because nothing in the app reads this
-- table through a browser Supabase client today — the app layer (Drizzle) is the
-- only consumer, and it isn't subject to RLS at all (docs/DECISIONS.md, 2026-09-03).
-- Adding an unused policy now would be untested, unreviewed surface area.
```

- [ ] **Step 5: Register in the journal, apply**

Same pattern as Task 1 Step 5–6: read the existing journal entries for the exact shape, append this migration's entry, run `npm run db:migrate`, confirm exit 0 and the policy visible in the dashboard.

- [ ] **Step 6: Write the failing test**

Create `tests/domain/clients.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createClientSchema } from "@/domain/clients/schema";

describe("createClientSchema", () => {
  it("accepts a client with just a name", () => {
    const result = createClientSchema.safeParse({ name: "Maria Silva" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createClientSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email when provided", () => {
    const result = createClientSchema.safeParse({ name: "Maria Silva", email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid email when provided", () => {
    const result = createClientSchema.safeParse({ name: "Maria Silva", email: "maria@example.com" });
    expect(result.success).toBe(true);
  });

  it("defaults marketingConsent to false", () => {
    const result = createClientSchema.parse({ name: "Maria Silva" });
    expect(result.marketingConsent).toBe(false);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/clients/schema` has no exports.

- [ ] **Step 8: Implement the Zod schema and service**

Create `domain/clients/schema.ts`:

```ts
import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  instagramHandle: z.string().optional(),
  birthday: z.string().optional(), // ISO date string, e.g. "1994-03-12"
  source: z.string().optional(),
  referrerClientId: z.string().uuid().optional(),
  styleProfile: z.string().optional(),
  notes: z.string().optional(),
  marketingConsent: z.boolean().default(false),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
```

Create `domain/clients/service.ts`:

```ts
import { db } from "@/db/client";
import { clients, type Client } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClientSchema, type CreateClientInput } from "./schema";

export async function createClient(input: CreateClientInput): Promise<Client> {
  const parsed = createClientSchema.parse(input);
  const [row] = await db.insert(clients).values(parsed).returning();
  return row;
}

export async function getClientById(id: string): Promise<Client | null> {
  const [row] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return row ?? null;
}
```

- [ ] **Step 9: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 5 tests passed.

- [ ] **Step 10: Integration check against the live database**

Add one more test to the same file that actually round-trips through the real database — this project has a live Supabase connection throughout this plan, unlike P0, so use it:

```ts
import { getClientById, createClient } from "@/domain/clients/service";

describe("createClient / getClientById (integration)", () => {
  it("creates a client and reads it back", async () => {
    const created = await createClient({ name: "Teste Epic1 SCL-100" });
    expect(created.id).toBeDefined();
    expect(created.marketingConsent).toBe(false);

    const fetched = await getClientById(created.id);
    expect(fetched?.name).toBe("Teste Epic1 SCL-100");
  });
});
```

Run `npm run test` — this hits the real database, so confirm `DATABASE_URL` is available in the test environment (it should be, via `.env.local`, the same way `npm run dev`/`db:migrate` pick it up — Vitest does NOT auto-load `.env.local` the way Next.js does, so if this test fails with a connection error, check whether `vitest.config.ts` needs an explicit `envDir`/`loadEnv` call, or whether running via `node --env-file-if-exists=.env.local node_modules/vitest/vitest.mjs run` is needed; adjust `package.json`'s `test` script accordingly if so, and note the change in your report — this is exactly the kind of environment-loading gap P0 hit twice with drizzle-kit).

After confirming the test passes, manually delete the test row it created (`Teste Epic1 SCL-100`) from the Supabase Table Editor, or add an `afterAll` cleanup to the test itself — don't leave synthetic data in the live table silently. Prefer the `afterAll` cleanup, written into the test file, since that keeps the test self-cleaning for every future run:

```ts
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";

afterAll(async () => {
  await db.delete(clients).where(eq(clients.name, "Teste Epic1 SCL-100"));
});
```

- [ ] **Step 11: Run the full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all green.

- [ ] **Step 12: Commit**

```powershell
git add db/schema/clients.ts db/schema/index.ts db/migrations/ domain/clients/ tests/domain/clients.test.ts
git commit -m "SCL-100: add Client schema with auth linkage and RLS backstop"
```

- [ ] **Step 13: Update `docs/TASKS.md`**

Same pattern as Task 1 Step 14 — summary row + detailed section for SCL-100, `DONE`, noting the live-database integration test and the `authUserId`/self-referential-FK design decisions. Commit: `SCL-100: mark task DONE in docs/TASKS.md`.

---

### Task 3: SCL-101 — Lead schema and status-transition validation

**Files:**
- Create: `db/schema/leads.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/000X_leads.sql` (generated)
- Create: `db/migrations/000Y_leads_rls.sql` (hand-written)
- Modify: `db/migrations/meta/_journal.json`
- Create: `domain/leads/schema.ts`
- Create: `domain/leads/service.ts`
- Create: `domain/leads/status.ts`
- Test: `tests/domain/leads.test.ts`
- Test: `tests/domain/lead-status.test.ts`
- Modify: `docs/TASKS.md` (add the missing SCL-101 row — flagged as absent by the P0 final review)

**Interfaces:**
- Consumes: `clients` table (Task 2), `profiles` table (P0) for `owner`.
- Produces: `leads` table + `Lead`/`NewLead` types; `createLeadSchema`, `createLead()`, `canTransitionLeadStatus()` from `domain/leads/`.

- [ ] **Step 1: Write the Drizzle schema**

Create `db/schema/leads.ts`:

```ts
import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const leadStatusEnum = pgEnum("lead_status", [
  "novo",
  "contato",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
]);

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id"), // nullable — PRD: "client_id ou dados temporários do contato"
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  source: text("source").notNull(),
  occasion: text("occasion"),
  quizResult: text("quiz_result"),
  status: leadStatusEnum("status").notNull().default("novo"),
  lostReason: text("lost_reason"),
  owner: uuid("owner"), // references profiles.id, nullable
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
```

Update `db/schema/index.ts` to add `export * from "./leads";`.

- [ ] **Step 2: Generate, add FKs, apply**

```powershell
npm run db:generate
```

Then, in the same generated migration file, append the two FK constraints (following Task 2 Step 2b's pattern — `client_id` isn't self-referential here, but adding it as an explicit statement after `CREATE TABLE` keeps the pattern consistent and lets you confirm both FKs by hand rather than trusting inference for a table with two FK columns):

```sql
--> statement-breakpoint
alter table "leads"
  add constraint "leads_client_id_fkey"
  foreign key ("client_id") references "clients"("id");
--> statement-breakpoint
alter table "leads"
  add constraint "leads_owner_fkey"
  foreign key ("owner") references "profiles"("id");
```

```powershell
npm run db:migrate
```

Expected: exits 0. Confirm both FKs exist via the dashboard or a query.

- [ ] **Step 3: Write the RLS migration**

```sql
alter table "leads" enable row level security;
--> statement-breakpoint

create policy "leads_staff_access"
  on "leads" for all
  using (public.is_staff_or_admin());
```

Register in the journal (same pattern as Task 1/2), apply, verify.

- [ ] **Step 4: Write the failing tests for status transitions**

Create `tests/domain/lead-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canTransitionLeadStatus } from "@/domain/leads/status";

describe("canTransitionLeadStatus", () => {
  it("allows the forward pipeline: novo -> contato -> proposta -> negociacao -> ganho", () => {
    expect(canTransitionLeadStatus("novo", "contato")).toBe(true);
    expect(canTransitionLeadStatus("contato", "proposta")).toBe(true);
    expect(canTransitionLeadStatus("proposta", "negociacao")).toBe(true);
    expect(canTransitionLeadStatus("negociacao", "ganho")).toBe(true);
  });

  it("allows perdido from any active stage", () => {
    expect(canTransitionLeadStatus("novo", "perdido")).toBe(true);
    expect(canTransitionLeadStatus("contato", "perdido")).toBe(true);
    expect(canTransitionLeadStatus("proposta", "perdido")).toBe(true);
    expect(canTransitionLeadStatus("negociacao", "perdido")).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(canTransitionLeadStatus("novo", "proposta")).toBe(false);
    expect(canTransitionLeadStatus("novo", "ganho")).toBe(false);
  });

  it("rejects any transition out of a terminal state", () => {
    expect(canTransitionLeadStatus("ganho", "contato")).toBe(false);
    expect(canTransitionLeadStatus("perdido", "novo")).toBe(false);
    expect(canTransitionLeadStatus("perdido", "contato")).toBe(false);
  });

  it("rejects a no-op transition", () => {
    expect(canTransitionLeadStatus("contato", "contato")).toBe(false);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/leads/status` has no exports.

- [ ] **Step 6: Implement `domain/leads/status.ts`**

```ts
import type { leadStatusEnum } from "@/db/schema";

export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];

const FORWARD_PIPELINE: LeadStatus[] = ["novo", "contato", "proposta", "negociacao", "ganho"];

const TERMINAL_STATES: LeadStatus[] = ["ganho", "perdido"];

export function canTransitionLeadStatus(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return false;
  if (TERMINAL_STATES.includes(from)) return false;

  if (to === "perdido") {
    return !TERMINAL_STATES.includes(from);
  }

  const fromIndex = FORWARD_PIPELINE.indexOf(from);
  const toIndex = FORWARD_PIPELINE.indexOf(to);
  return fromIndex !== -1 && toIndex === fromIndex + 1;
}
```

- [ ] **Step 7: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 5 tests passed.

- [ ] **Step 8: Write the failing test for Zod validation + service**

Create `tests/domain/leads.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createLeadSchema } from "@/domain/leads/schema";

describe("createLeadSchema", () => {
  it("accepts a lead with just a source", () => {
    const result = createLeadSchema.safeParse({ source: "Instagram" });
    expect(result.success).toBe(true);
  });

  it("defaults status to novo", () => {
    const result = createLeadSchema.parse({ source: "Instagram" });
    expect(result.status).toBe("novo");
  });

  it("rejects a missing source", () => {
    const result = createLeadSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status value", () => {
    const result = createLeadSchema.safeParse({ source: "Instagram", status: "not-a-real-status" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 9: Run test to verify it fails, then implement**

```powershell
npm run test
```

Expected: FAIL — `@/domain/leads/schema` has no exports.

Create `domain/leads/schema.ts`:

```ts
import { z } from "zod";

export const leadStatusValues = ["novo", "contato", "proposta", "negociacao", "ganho", "perdido"] as const;

export const createLeadSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.string().min(1),
  occasion: z.string().optional(),
  quizResult: z.string().optional(),
  status: z.enum(leadStatusValues).default("novo"),
  lostReason: z.string().optional(),
  owner: z.string().uuid().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
```

Create `domain/leads/service.ts`:

```ts
import { db } from "@/db/client";
import { leads, type Lead } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createLeadSchema, type CreateLeadInput } from "./schema";

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const parsed = createLeadSchema.parse(input);
  const [row] = await db.insert(leads).values(parsed).returning();
  return row;
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return row ?? null;
}
```

- [ ] **Step 10: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 tests passed (plus the 5 from Step 7, 9 total new this task).

- [ ] **Step 11: Run the full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all green.

- [ ] **Step 12: Commit**

```powershell
git add db/schema/leads.ts db/schema/index.ts db/migrations/ domain/leads/ tests/domain/leads.test.ts tests/domain/lead-status.test.ts
git commit -m "SCL-101: add Lead schema, status-transition rules, and RLS backstop"
```

- [ ] **Step 13: Update `docs/TASKS.md`**

Add the **missing SCL-101 summary-table row** (it doesn't exist yet — the P0 final review flagged this gap) between SCL-100 and SCL-102, `Priority: P0`, `Area: db`, `Depends on: SCL-005,SCL-100`, status `DONE`. Add a detailed section following the established format. Commit: `SCL-101: mark task DONE in docs/TASKS.md`.

---

### Task 4: SCL-103 — Shoot schema and status-transition validation

**Files:**
- Create: `db/schema/shoots.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/000X_shoots.sql` (generated)
- Create: `db/migrations/000Y_shoots_rls.sql` (hand-written)
- Modify: `db/migrations/meta/_journal.json`
- Create: `domain/shoots/schema.ts`
- Create: `domain/shoots/service.ts`
- Create: `domain/shoots/status.ts`
- Test: `tests/domain/shoots.test.ts`
- Test: `tests/domain/shoot-status.test.ts`

**Interfaces:**
- Consumes: `clients` (Task 2), `experiencePackages` (Task 1).
- Produces: `shoots` table + `Shoot`/`NewShoot` types; `createShootSchema`, `createShoot()`, `canTransitionShootStatus()` — the central entity every later task in this plan (Payment, PreparationTask, ProductionJob) and Epic 2's agenda/CRM UI depend on.

- [ ] **Step 1: Write the Drizzle schema**

Create `db/schema/shoots.ts`:

```ts
import { pgTable, uuid, text, date, time, integer, numeric, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const shootStatusEnum = pgEnum("shoot_status", [
  "reserva",
  "preparacao",
  "realizado",
  "edicao",
  "finalizado",
  "reveal",
  "entregue",
  "cancelado",
  "reagendado",
]);

// Cached/denormalized, NOT a second source of truth: this column exists so admin
// list views don't have to re-sum Payment rows on every render. It must only ever
// be written by the payment-registration domain function (Epic 2's SCL-220, which
// calls domain/payments' deriveShootPaymentStatus() from Task 5 of this plan) — it
// is never user-editable directly. The real source of truth is always the sum of
// confirmed Payment rows for this shoot; see PRD §7.5 and the Payment task's
// derivation function for the actual calculation.
export const shootPaymentStatusEnum = pgEnum("shoot_payment_status", [
  "nao_iniciado",
  "parcial",
  "pago",
  "reembolsado",
  "cancelado",
]);

export const shoots = pgTable("shoots", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull(),
  experiencePackageId: uuid("experience_package_id").notNull(),
  shootDate: date("shoot_date").notNull(),
  startTime: time("start_time"),
  status: shootStatusEnum("status").notNull().default("reserva"),
  agreedPrice: numeric("agreed_price", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: shootPaymentStatusEnum("payment_status").notNull().default("nao_iniciado"),
  participantCount: integer("participant_count"),
  occasion: text("occasion"),
  referral: text("referral"),
  notes: text("notes"),
  portalEnabled: boolean("portal_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Shoot = typeof shoots.$inferSelect;
export type NewShoot = typeof shoots.$inferInsert;
```

Update `db/schema/index.ts` to add `export * from "./shoots";`.

- [ ] **Step 2: Generate, add FKs, apply**

```powershell
npm run db:generate
```

Append the two FK constraints in the same generated file:

```sql
--> statement-breakpoint
alter table "shoots"
  add constraint "shoots_client_id_fkey"
  foreign key ("client_id") references "clients"("id");
--> statement-breakpoint
alter table "shoots"
  add constraint "shoots_experience_package_id_fkey"
  foreign key ("experience_package_id") references "experience_packages"("id");
```

```powershell
npm run db:migrate
```

Expected: exits 0. Confirm both FKs.

- [ ] **Step 3: Write the RLS migration**

```sql
alter table "shoots" enable row level security;
--> statement-breakpoint

create policy "shoots_staff_access"
  on "shoots" for all
  using (public.is_staff_or_admin());
```

Register in the journal, apply, verify. (Client-row policy — a client reading only their own Shoot via `clients.auth_user_id` — is deferred to Epic 3, same reasoning as Task 2's `clients_rls` migration.)

- [ ] **Step 4: Write the failing tests for status transitions**

Create `tests/domain/shoot-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canTransitionShootStatus } from "@/domain/shoots/status";

describe("canTransitionShootStatus", () => {
  it("allows the forward pipeline in order", () => {
    expect(canTransitionShootStatus("reserva", "preparacao")).toBe(true);
    expect(canTransitionShootStatus("preparacao", "realizado")).toBe(true);
    expect(canTransitionShootStatus("realizado", "edicao")).toBe(true);
    expect(canTransitionShootStatus("edicao", "finalizado")).toBe(true);
    expect(canTransitionShootStatus("finalizado", "reveal")).toBe(true);
    expect(canTransitionShootStatus("reveal", "entregue")).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(canTransitionShootStatus("reserva", "realizado")).toBe(false);
    expect(canTransitionShootStatus("reserva", "entregue")).toBe(false);
  });

  it("allows cancelado from any non-terminal active stage", () => {
    expect(canTransitionShootStatus("reserva", "cancelado")).toBe(true);
    expect(canTransitionShootStatus("preparacao", "cancelado")).toBe(true);
    expect(canTransitionShootStatus("edicao", "cancelado")).toBe(true);
  });

  it("allows reagendado only from pre-realizado stages", () => {
    expect(canTransitionShootStatus("reserva", "reagendado")).toBe(true);
    expect(canTransitionShootStatus("preparacao", "reagendado")).toBe(true);
    expect(canTransitionShootStatus("realizado", "reagendado")).toBe(false);
    expect(canTransitionShootStatus("edicao", "reagendado")).toBe(false);
  });

  it("rejects any transition out of a terminal state", () => {
    expect(canTransitionShootStatus("entregue", "reveal")).toBe(false);
    expect(canTransitionShootStatus("cancelado", "reserva")).toBe(false);
  });

  it("allows reagendado back to reserva", () => {
    expect(canTransitionShootStatus("reagendado", "reserva")).toBe(true);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/shoots/status` has no exports.

- [ ] **Step 6: Implement `domain/shoots/status.ts`**

```ts
import type { shootStatusEnum } from "@/db/schema";

export type ShootStatus = (typeof shootStatusEnum.enumValues)[number];

const FORWARD_PIPELINE: ShootStatus[] = [
  "reserva",
  "preparacao",
  "realizado",
  "edicao",
  "finalizado",
  "reveal",
  "entregue",
];

const TERMINAL_STATES: ShootStatus[] = ["entregue", "cancelado"];

// Once shooting has actually happened, "reagendado" (reschedule) no longer makes
// sense — the shoot occurred. Cancelado remains possible even after realizado
// (e.g. the client cancels editing/delivery), so it isn't in this list.
const PRE_SHOOT_STAGES: ShootStatus[] = ["reserva", "preparacao"];

export function canTransitionShootStatus(from: ShootStatus, to: ShootStatus): boolean {
  if (from === to) return false;
  if (TERMINAL_STATES.includes(from)) return false;

  if (to === "cancelado") {
    return true;
  }

  if (to === "reagendado") {
    return PRE_SHOOT_STAGES.includes(from);
  }

  if (from === "reagendado") {
    return to === "reserva";
  }

  const fromIndex = FORWARD_PIPELINE.indexOf(from);
  const toIndex = FORWARD_PIPELINE.indexOf(to);
  return fromIndex !== -1 && toIndex === fromIndex + 1;
}
```

- [ ] **Step 7: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 6 tests passed.

- [ ] **Step 8: Write the failing test for Zod validation + service**

Create `tests/domain/shoots.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createShootSchema } from "@/domain/shoots/schema";

describe("createShootSchema", () => {
  const validBase = {
    clientId: "00000000-0000-0000-0000-000000000001",
    experiencePackageId: "00000000-0000-0000-0000-000000000002",
    shootDate: "2026-12-01",
    agreedPrice: "1200.00",
  };

  it("accepts a minimal valid shoot", () => {
    expect(createShootSchema.safeParse(validBase).success).toBe(true);
  });

  it("defaults status to reserva and paymentStatus to nao_iniciado", () => {
    const parsed = createShootSchema.parse(validBase);
    expect(parsed.status).toBe("reserva");
    expect(parsed.paymentStatus).toBe("nao_iniciado");
  });

  it("rejects a missing clientId", () => {
    const { clientId, ...rest } = validBase;
    expect(createShootSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an invalid clientId (not a uuid)", () => {
    expect(createShootSchema.safeParse({ ...validBase, clientId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects a missing agreedPrice", () => {
    const { agreedPrice, ...rest } = validBase;
    expect(createShootSchema.safeParse(rest).success).toBe(false);
  });
});
```

- [ ] **Step 9: Run test to verify it fails, then implement**

```powershell
npm run test
```

Expected: FAIL — `@/domain/shoots/schema` has no exports.

Create `domain/shoots/schema.ts`:

```ts
import { z } from "zod";

export const shootStatusValues = [
  "reserva",
  "preparacao",
  "realizado",
  "edicao",
  "finalizado",
  "reveal",
  "entregue",
  "cancelado",
  "reagendado",
] as const;

export const shootPaymentStatusValues = ["nao_iniciado", "parcial", "pago", "reembolsado", "cancelado"] as const;

export const createShootSchema = z.object({
  clientId: z.string().uuid(),
  experiencePackageId: z.string().uuid(),
  shootDate: z.string(), // ISO date, e.g. "2026-12-01"
  startTime: z.string().optional(), // "HH:mm" or "HH:mm:ss"
  status: z.enum(shootStatusValues).default("reserva"),
  agreedPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "must be a decimal string like \"1200.00\""),
  paymentStatus: z.enum(shootPaymentStatusValues).default("nao_iniciado"),
  participantCount: z.number().int().positive().optional(),
  occasion: z.string().optional(),
  referral: z.string().optional(),
  notes: z.string().optional(),
  portalEnabled: z.boolean().default(false),
});

export type CreateShootInput = z.infer<typeof createShootSchema>;
```

Create `domain/shoots/service.ts`:

```ts
import { db } from "@/db/client";
import { shoots, type Shoot } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createShootSchema, type CreateShootInput } from "./schema";

export async function createShoot(input: CreateShootInput): Promise<Shoot> {
  const parsed = createShootSchema.parse(input);
  const [row] = await db.insert(shoots).values(parsed).returning();
  return row;
}

export async function getShootById(id: string): Promise<Shoot | null> {
  const [row] = await db.select().from(shoots).where(eq(shoots.id, id)).limit(1);
  return row ?? null;
}
```

Note: `createShoot()` deliberately does NOT auto-create a `ProductionJob` or `PreparationTask` checklist — that orchestration is Epic 2's SCL-211 ("Criar ensaio ponta a ponta"), which composes this function with Task 6/7's `createProductionJob()`/checklist helpers inside one transaction, once the admin UI actually needs it. Building that orchestration here, with no caller, would be guessing at a transaction boundary Epic 2 hasn't specified yet.

- [ ] **Step 10: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 5 tests passed.

- [ ] **Step 11: Run the full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all green.

- [ ] **Step 12: Commit**

```powershell
git add db/schema/shoots.ts db/schema/index.ts db/migrations/ domain/shoots/ tests/domain/shoots.test.ts tests/domain/shoot-status.test.ts
git commit -m "SCL-103: add Shoot schema, status-transition rules, and RLS backstop"
```

- [ ] **Step 13: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-103, `DONE`, with the `payment_status` denormalization design note copied into Implementation notes so Epic 2's SCL-220 implementer sees it. Commit: `SCL-103: mark task DONE in docs/TASKS.md`.

---

### Task 5: SCL-104 — Payment and Expense schemas, balance/financial-status derivation

**Files:**
- Create: `db/schema/payments.ts`
- Create: `db/schema/expenses.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/000X_payments_and_expenses.sql` (generated)
- Create: `db/migrations/000Y_payments_and_expenses_rls.sql` (hand-written)
- Modify: `db/migrations/meta/_journal.json`
- Create: `domain/payments/schema.ts`
- Create: `domain/payments/service.ts`
- Create: `domain/payments/balance.ts`
- Test: `tests/domain/payments.test.ts`
- Test: `tests/domain/balance.test.ts`

**Interfaces:**
- Consumes: `shoots` (Task 4).
- Produces: `payments`/`expenses` tables; `calculateBalance()` and `deriveShootPaymentStatus()` from `domain/payments/balance.ts` — PRD's own testing-strategy section (§15) names these as the highest-priority unit tests in the whole product ("cálculo de saldo... status financeiro"); Epic 2's SCL-220 imports both directly.

- [ ] **Step 1: Write the Drizzle schemas**

Create `db/schema/payments.ts`:

```ts
import { pgTable, uuid, numeric, timestamp, text, pgEnum } from "drizzle-orm/pg-core";

export const paymentEntryStatusEnum = pgEnum("payment_entry_status", [
  "pendente",
  "confirmado",
  "estornado",
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootId: uuid("shoot_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  method: text("method"),
  status: paymentEntryStatusEnum("status").notNull().default("pendente"),
  proofUrl: text("proof_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
```

Create `db/schema/expenses.ts`:

```ts
import { pgTable, uuid, numeric, date, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const expenseTypeEnum = pgEnum("expense_type", ["custo", "investimento", "funcionario"]);

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  type: expenseTypeEnum("type").notNull(),
  category: text("category"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method"),
  recurring: boolean("recurring").notNull().default(false),
  proofUrl: text("proof_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
```

Update `db/schema/index.ts` to add both exports.

- [ ] **Step 2: Generate, add FK, apply**

```powershell
npm run db:generate
```

Append the `payments.shoot_id` FK (`expenses` has no FK — it's independent per PRD §7.5):

```sql
--> statement-breakpoint
alter table "payments"
  add constraint "payments_shoot_id_fkey"
  foreign key ("shoot_id") references "shoots"("id");
```

```powershell
npm run db:migrate
```

Expected: exits 0. Confirm the FK and both tables.

- [ ] **Step 3: Write the RLS migration**

```sql
alter table "payments" enable row level security;
--> statement-breakpoint

create policy "payments_staff_access"
  on "payments" for all
  using (public.is_staff_or_admin());
--> statement-breakpoint

alter table "expenses" enable row level security;
--> statement-breakpoint

create policy "expenses_staff_access"
  on "expenses" for all
  using (public.is_staff_or_admin());
```

Register in the journal, apply, verify both tables show RLS enabled with their policy.

- [ ] **Step 4: Write the failing tests for balance/status derivation**

Create `tests/domain/balance.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateBalance, deriveShootPaymentStatus } from "@/domain/payments/balance";

describe("calculateBalance", () => {
  it("returns the full agreed price when there are no payments", () => {
    expect(calculateBalance("1000.00", [])).toBe("1000.00");
  });

  it("subtracts only confirmed payments", () => {
    const payments = [
      { amount: "300.00", status: "confirmado" as const },
      { amount: "200.00", status: "pendente" as const },
      { amount: "100.00", status: "estornado" as const },
    ];
    expect(calculateBalance("1000.00", payments)).toBe("700.00");
  });

  it("returns zero balance when confirmed payments equal the agreed price", () => {
    const payments = [{ amount: "1000.00", status: "confirmado" as const }];
    expect(calculateBalance("1000.00", payments)).toBe("0.00");
  });

  it("returns a negative balance when confirmed payments exceed the agreed price (overpayment, not clamped)", () => {
    const payments = [{ amount: "1200.00", status: "confirmado" as const }];
    expect(calculateBalance("1000.00", payments)).toBe("-200.00");
  });
});

describe("deriveShootPaymentStatus", () => {
  it("is nao_iniciado when there are no confirmed payments", () => {
    expect(deriveShootPaymentStatus("1000.00", [])).toBe("nao_iniciado");
  });

  it("is parcial when some but not all of the agreed price is confirmed-paid", () => {
    const payments = [{ amount: "400.00", status: "confirmado" as const }];
    expect(deriveShootPaymentStatus("1000.00", payments)).toBe("parcial");
  });

  it("is pago when confirmed payments meet or exceed the agreed price", () => {
    const payments = [{ amount: "1000.00", status: "confirmado" as const }];
    expect(deriveShootPaymentStatus("1000.00", payments)).toBe("pago");

    const overpaid = [{ amount: "1100.00", status: "confirmado" as const }];
    expect(deriveShootPaymentStatus("1000.00", overpaid)).toBe("pago");
  });

  it("ignores pendente and estornado payments entirely", () => {
    const payments = [
      { amount: "1000.00", status: "pendente" as const },
      { amount: "1000.00", status: "estornado" as const },
    ];
    expect(deriveShootPaymentStatus("1000.00", payments)).toBe("nao_iniciado");
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/payments/balance` has no exports.

- [ ] **Step 6: Implement `domain/payments/balance.ts`**

Money is handled as decimal strings throughout (matching Postgres `numeric` and the Zod pattern from Task 1/2/4) rather than `number`, to avoid float rounding errors compounding across many payments — arithmetic goes through a minimal fixed-point helper working in cents:

```ts
type PaymentForBalance = { amount: string; status: "pendente" | "confirmado" | "estornado" };

function toCents(decimalString: string): number {
  const [whole, fraction = "0"] = decimalString.split(".");
  const cents = `${fraction}00`.slice(0, 2);
  return Number(whole) * 100 + Number(cents) * (whole.startsWith("-") ? -1 : 1);
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

function sumConfirmed(payments: PaymentForBalance[]): number {
  return payments
    .filter((p) => p.status === "confirmado")
    .reduce((sum, p) => sum + toCents(p.amount), 0);
}

/**
 * saldo = valor_acordado - soma(pagamentos confirmados) — PRD §7.5.
 * Deliberately not clamped at zero: a negative result signals overpayment,
 * which is a real state the UI (Epic 2) should surface, not silently hide.
 */
export function calculateBalance(agreedPrice: string, payments: PaymentForBalance[]): string {
  const balanceCents = toCents(agreedPrice) - sumConfirmed(payments);
  return fromCents(balanceCents);
}

/**
 * Derives only the three states this function can determine from confirmed
 * payments vs. agreed price. "reembolsado" and "cancelado" are not derivable this
 * way — they represent an explicit event (a refund was issued; the shoot was
 * cancelled), not a payment-sum threshold, and must be set directly by the
 * domain action that handles that event (Epic 2), not by this function.
 */
export function deriveShootPaymentStatus(
  agreedPrice: string,
  payments: PaymentForBalance[]
): "nao_iniciado" | "parcial" | "pago" {
  const confirmedCents = sumConfirmed(payments);
  if (confirmedCents <= 0) return "nao_iniciado";
  if (confirmedCents >= toCents(agreedPrice)) return "pago";
  return "parcial";
}
```

- [ ] **Step 7: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 8 tests passed.

- [ ] **Step 8: Write the failing test for Zod validation + service**

Create `tests/domain/payments.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createPaymentSchema } from "@/domain/payments/schema";

describe("createPaymentSchema", () => {
  const validBase = {
    shootId: "00000000-0000-0000-0000-000000000001",
    amount: "300.00",
  };

  it("accepts a minimal valid payment", () => {
    expect(createPaymentSchema.safeParse(validBase).success).toBe(true);
  });

  it("defaults status to pendente", () => {
    expect(createPaymentSchema.parse(validBase).status).toBe("pendente");
  });

  it("rejects a missing shootId", () => {
    const { shootId, ...rest } = validBase;
    expect(createPaymentSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a malformed amount", () => {
    expect(createPaymentSchema.safeParse({ ...validBase, amount: "not-a-number" }).success).toBe(false);
  });
});
```

- [ ] **Step 9: Run test to verify it fails, then implement**

```powershell
npm run test
```

Expected: FAIL — `@/domain/payments/schema` has no exports.

Create `domain/payments/schema.ts`:

```ts
import { z } from "zod";

export const paymentEntryStatusValues = ["pendente", "confirmado", "estornado"] as const;

const decimalString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, "must be a decimal string like \"300.00\"");

export const createPaymentSchema = z.object({
  shootId: z.string().uuid(),
  amount: decimalString,
  paidAt: z.string().optional(), // ISO datetime
  method: z.string().optional(),
  status: z.enum(paymentEntryStatusValues).default("pendente"),
  proofUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const expenseTypeValues = ["custo", "investimento", "funcionario"] as const;

export const createExpenseSchema = z.object({
  date: z.string(), // ISO date
  type: z.enum(expenseTypeValues),
  category: z.string().optional(),
  amount: decimalString,
  method: z.string().optional(),
  recurring: z.boolean().default(false),
  proofUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
```

Create `domain/payments/service.ts`:

```ts
import { db } from "@/db/client";
import { payments, expenses, type Payment, type Expense } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPaymentSchema, createExpenseSchema, type CreatePaymentInput, type CreateExpenseInput } from "./schema";

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const parsed = createPaymentSchema.parse(input);
  const [row] = await db.insert(payments).values(parsed).returning();
  return row;
}

export async function getPaymentsByShootId(shootId: string): Promise<Payment[]> {
  return db.select().from(payments).where(eq(payments.shootId, shootId));
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const parsed = createExpenseSchema.parse(input);
  const [row] = await db.insert(expenses).values(parsed).returning();
  return row;
}
```

Note: `createPayment()` deliberately does NOT call `deriveShootPaymentStatus()`/update the `shoots.payment_status` cache — wiring that recalculation into an atomic "register payment + recalc status" transaction is Epic 2's SCL-220, which has the actual caller and can decide the transaction boundary. This task only guarantees the calculation itself is correct and independently tested.

- [ ] **Step 10: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 tests passed.

- [ ] **Step 11: Run the full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all green.

- [ ] **Step 12: Commit**

```powershell
git add db/schema/payments.ts db/schema/expenses.ts db/schema/index.ts db/migrations/ domain/payments/ tests/domain/payments.test.ts tests/domain/balance.test.ts
git commit -m "SCL-104: add Payment/Expense schemas and balance derivation"
```

- [ ] **Step 13: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-104, `DONE`, with an Implementation notes entry pointing SCL-220's future implementer directly at `calculateBalance()`/`deriveShootPaymentStatus()` instead of re-deriving the arithmetic inline. Commit: `SCL-104: mark task DONE in docs/TASKS.md`.

---

### Task 6: SCL-105 — PreparationTask schema

**Files:**
- Create: `db/schema/preparation-tasks.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/000X_preparation_tasks.sql` (generated)
- Create: `db/migrations/000Y_preparation_tasks_rls.sql` (hand-written)
- Modify: `db/migrations/meta/_journal.json`
- Create: `domain/preparation/schema.ts`
- Create: `domain/preparation/service.ts`
- Test: `tests/domain/preparation-tasks.test.ts`

**Interfaces:**
- Consumes: `shoots` (Task 4).
- Produces: `preparationTasks` table; `createPreparationTaskSchema`, `createPreparationTask()`, `getPreparationTasksByShootId()`.

- [ ] **Step 1: Write the Drizzle schema**

Create `db/schema/preparation-tasks.ts`:

```ts
import { pgTable, uuid, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const preparationTaskStatusEnum = pgEnum("preparation_task_status", [
  "pendente",
  "em_andamento",
  "concluida",
]);

export const preparationTasks = pgTable("preparation_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootId: uuid("shoot_id").notNull(),
  type: text("type").notNull(), // e.g. "moodboard", "figurino", "clutch", "make", "pagamento"
  title: text("title").notNull(),
  status: preparationTaskStatusEnum("status").notNull().default("pendente"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  visibleToClient: boolean("visible_to_client").notNull().default(true),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PreparationTask = typeof preparationTasks.$inferSelect;
export type NewPreparationTask = typeof preparationTasks.$inferInsert;
```

Update `db/schema/index.ts` to add `export * from "./preparation-tasks";`.

- [ ] **Step 2: Generate, add FK, apply**

```powershell
npm run db:generate
```

Append:

```sql
--> statement-breakpoint
alter table "preparation_tasks"
  add constraint "preparation_tasks_shoot_id_fkey"
  foreign key ("shoot_id") references "shoots"("id");
```

```powershell
npm run db:migrate
```

Expected: exits 0.

- [ ] **Step 3: Write the RLS migration**

```sql
alter table "preparation_tasks" enable row level security;
--> statement-breakpoint

create policy "preparation_tasks_staff_access"
  on "preparation_tasks" for all
  using (public.is_staff_or_admin());
```

Register in the journal, apply, verify. (A client reading only their own shoot's `visible_to_client = true` tasks is Epic 3 work, same deferral reasoning as Tasks 2 and 4.)

- [ ] **Step 4: Write the failing test**

Create `tests/domain/preparation-tasks.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createPreparationTaskSchema } from "@/domain/preparation/schema";

describe("createPreparationTaskSchema", () => {
  const validBase = {
    shootId: "00000000-0000-0000-0000-000000000001",
    type: "moodboard",
    title: "Enviar moodboard de referência",
  };

  it("accepts a minimal valid task", () => {
    expect(createPreparationTaskSchema.safeParse(validBase).success).toBe(true);
  });

  it("defaults status to pendente and visibleToClient to true", () => {
    const parsed = createPreparationTaskSchema.parse(validBase);
    expect(parsed.status).toBe("pendente");
    expect(parsed.visibleToClient).toBe(true);
  });

  it("rejects a missing title", () => {
    const { title, ...rest } = validBase;
    expect(createPreparationTaskSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a missing shootId", () => {
    const { shootId, ...rest } = validBase;
    expect(createPreparationTaskSchema.safeParse(rest).success).toBe(false);
  });
});
```

- [ ] **Step 5: Run test to verify it fails, then implement**

```powershell
npm run test
```

Expected: FAIL — `@/domain/preparation/schema` has no exports.

Create `domain/preparation/schema.ts`:

```ts
import { z } from "zod";

export const preparationTaskStatusValues = ["pendente", "em_andamento", "concluida"] as const;

export const createPreparationTaskSchema = z.object({
  shootId: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(preparationTaskStatusValues).default("pendente"),
  dueAt: z.string().optional(),
  visibleToClient: z.boolean().default(true),
});

export type CreatePreparationTaskInput = z.infer<typeof createPreparationTaskSchema>;
```

Create `domain/preparation/service.ts`:

```ts
import { db } from "@/db/client";
import { preparationTasks, type PreparationTask } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPreparationTaskSchema, type CreatePreparationTaskInput } from "./schema";

export async function createPreparationTask(input: CreatePreparationTaskInput): Promise<PreparationTask> {
  const parsed = createPreparationTaskSchema.parse(input);
  const [row] = await db.insert(preparationTasks).values(parsed).returning();
  return row;
}

export async function getPreparationTasksByShootId(shootId: string): Promise<PreparationTask[]> {
  return db.select().from(preparationTasks).where(eq(preparationTasks.shootId, shootId));
}
```

- [ ] **Step 6: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 4 tests passed.

- [ ] **Step 7: Run the full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all green.

- [ ] **Step 8: Commit**

```powershell
git add db/schema/preparation-tasks.ts db/schema/index.ts db/migrations/ domain/preparation/ tests/domain/preparation-tasks.test.ts
git commit -m "SCL-105: add PreparationTask schema and RLS backstop"
```

- [ ] **Step 9: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-105, `DONE`. Commit: `SCL-105: mark task DONE in docs/TASKS.md`.

---

### Task 7: SCL-106 — ProductionJob schema and status-transition validation

**Files:**
- Create: `db/schema/production-jobs.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/000X_production_jobs.sql` (generated)
- Create: `db/migrations/000Y_production_jobs_rls.sql` (hand-written)
- Modify: `db/migrations/meta/_journal.json`
- Create: `domain/production/schema.ts`
- Create: `domain/production/service.ts`
- Create: `domain/production/status.ts`
- Test: `tests/domain/production-jobs.test.ts`
- Test: `tests/domain/production-status.test.ts`

**Interfaces:**
- Consumes: `shoots` (Task 4), `profiles` (P0, for `editorUserId`).
- Produces: `productionJobs` table (1:1 with `shoots` via a unique FK); `createProductionJobSchema`, `createProductionJob()`, `canTransitionProductionStatus()`.

- [ ] **Step 1: Write the Drizzle schema**

Create `db/schema/production-jobs.ts`:

```ts
import { pgTable, uuid, integer, date, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const productionJobStatusEnum = pgEnum("production_job_status", [
  "aguardando",
  "iniciado",
  "parcial",
  "finalizado",
  "entregue",
]);

export const productionJobs = pgTable("production_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  shootId: uuid("shoot_id").notNull().unique(), // 1:1 with Shoot
  status: productionJobStatusEnum("status").notNull().default("aguardando"),
  editorUserId: uuid("editor_user_id"),
  photosToEdit: integer("photos_to_edit"),
  deliveryDueAt: date("delivery_due_at"),
  deliveryAt: date("delivery_at"),
  selectionStatus: text("selection_status"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductionJob = typeof productionJobs.$inferSelect;
export type NewProductionJob = typeof productionJobs.$inferInsert;
```

Update `db/schema/index.ts` to add `export * from "./production-jobs";`.

- [ ] **Step 2: Generate, add FKs, apply**

```powershell
npm run db:generate
```

Append:

```sql
--> statement-breakpoint
alter table "production_jobs"
  add constraint "production_jobs_shoot_id_fkey"
  foreign key ("shoot_id") references "shoots"("id");
--> statement-breakpoint
alter table "production_jobs"
  add constraint "production_jobs_editor_user_id_fkey"
  foreign key ("editor_user_id") references "profiles"("id");
```

```powershell
npm run db:migrate
```

Expected: exits 0. Confirm the unique constraint on `shoot_id` (from `.unique()` in the schema) actually landed — check the generated SQL includes a `UNIQUE` constraint or index on that column before appending the FK statements, and don't duplicate it.

- [ ] **Step 3: Write the RLS migration**

```sql
alter table "production_jobs" enable row level security;
--> statement-breakpoint

create policy "production_jobs_staff_access"
  on "production_jobs" for all
  using (public.is_staff_or_admin());
```

Register in the journal, apply, verify.

- [ ] **Step 4: Write the failing tests for status transitions**

Create `tests/domain/production-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canTransitionProductionStatus } from "@/domain/production/status";

describe("canTransitionProductionStatus", () => {
  it("allows the linear pipeline in order", () => {
    expect(canTransitionProductionStatus("aguardando", "iniciado")).toBe(true);
    expect(canTransitionProductionStatus("iniciado", "parcial")).toBe(true);
    expect(canTransitionProductionStatus("parcial", "finalizado")).toBe(true);
    expect(canTransitionProductionStatus("finalizado", "entregue")).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(canTransitionProductionStatus("aguardando", "finalizado")).toBe(false);
    expect(canTransitionProductionStatus("iniciado", "entregue")).toBe(false);
  });

  it("rejects any transition out of the terminal state", () => {
    expect(canTransitionProductionStatus("entregue", "finalizado")).toBe(false);
  });

  it("rejects a no-op transition", () => {
    expect(canTransitionProductionStatus("iniciado", "iniciado")).toBe(false);
  });

  it("allows iniciado to skip directly to finalizado (small job, no partial batch)", () => {
    // PRD's diagram shows a strictly linear pipeline, but the plan's own Shoot
    // status rules allow skip-free stages only — for ProductionJob specifically,
    // "parcial" represents a partial photo batch delivery, which not every job
    // has (a small shoot might finish all editing in one pass). Documented here
    // rather than silently assumed: this is the one deliberate deviation from a
    // strictly linear PRD diagram in this plan, because forcing every job through
    // an unused "parcial" state would misrepresent real production status.
    expect(canTransitionProductionStatus("iniciado", "finalizado")).toBe(true);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/production/status` has no exports.

- [ ] **Step 6: Implement `domain/production/status.ts`**

```ts
import type { productionJobStatusEnum } from "@/db/schema";

export type ProductionJobStatus = (typeof productionJobStatusEnum.enumValues)[number];

const ORDER: ProductionJobStatus[] = ["aguardando", "iniciado", "parcial", "finalizado", "entregue"];

const TERMINAL_STATES: ProductionJobStatus[] = ["entregue"];

export function canTransitionProductionStatus(
  from: ProductionJobStatus,
  to: ProductionJobStatus
): boolean {
  if (from === to) return false;
  if (TERMINAL_STATES.includes(from)) return false;

  const fromIndex = ORDER.indexOf(from);
  const toIndex = ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1 || toIndex <= fromIndex) return false;

  // Allow skipping "parcial" specifically (not every job has a partial batch),
  // but never skip "iniciado" itself — a job must actually start before any
  // later state, and skipping straight past "finalizado" to "entregue" without
  // being finalized first is still disallowed by the toIndex - fromIndex === 1
  // check below for every other pair.
  if (from === "iniciado" && to === "finalizado") return true;

  return toIndex === fromIndex + 1;
}
```

- [ ] **Step 7: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 5 tests passed.

- [ ] **Step 8: Write the failing test for Zod validation + service**

Create `tests/domain/production-jobs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createProductionJobSchema } from "@/domain/production/schema";

describe("createProductionJobSchema", () => {
  const validBase = {
    shootId: "00000000-0000-0000-0000-000000000001",
  };

  it("accepts a minimal valid job", () => {
    expect(createProductionJobSchema.safeParse(validBase).success).toBe(true);
  });

  it("defaults status to aguardando", () => {
    expect(createProductionJobSchema.parse(validBase).status).toBe("aguardando");
  });

  it("rejects a missing shootId", () => {
    expect(createProductionJobSchema.safeParse({}).success).toBe(false);
  });
});
```

- [ ] **Step 9: Run test to verify it fails, then implement**

```powershell
npm run test
```

Expected: FAIL — `@/domain/production/schema` has no exports.

Create `domain/production/schema.ts`:

```ts
import { z } from "zod";

export const productionJobStatusValues = ["aguardando", "iniciado", "parcial", "finalizado", "entregue"] as const;

export const createProductionJobSchema = z.object({
  shootId: z.string().uuid(),
  status: z.enum(productionJobStatusValues).default("aguardando"),
  editorUserId: z.string().uuid().optional(),
  photosToEdit: z.number().int().positive().optional(),
  deliveryDueAt: z.string().optional(),
  selectionStatus: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateProductionJobInput = z.infer<typeof createProductionJobSchema>;
```

Create `domain/production/service.ts`:

```ts
import { db } from "@/db/client";
import { productionJobs, type ProductionJob } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createProductionJobSchema, type CreateProductionJobInput } from "./schema";

export async function createProductionJob(input: CreateProductionJobInput): Promise<ProductionJob> {
  const parsed = createProductionJobSchema.parse(input);
  const [row] = await db.insert(productionJobs).values(parsed).returning();
  return row;
}

export async function getProductionJobByShootId(shootId: string): Promise<ProductionJob | null> {
  const [row] = await db
    .select()
    .from(productionJobs)
    .where(eq(productionJobs.shootId, shootId))
    .limit(1);
  return row ?? null;
}
```

- [ ] **Step 10: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 3 tests passed.

- [ ] **Step 11: Run the full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all green.

- [ ] **Step 12: Commit**

```powershell
git add db/schema/production-jobs.ts db/schema/index.ts db/migrations/ domain/production/ tests/domain/production-jobs.test.ts tests/domain/production-status.test.ts
git commit -m "SCL-106: add ProductionJob schema, status-transition rules, and RLS backstop"
```

- [ ] **Step 13: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-106, `DONE`, with the "iniciado→finalizado skip" deviation from a strictly linear pipeline recorded in Implementation notes. Commit: `SCL-106: mark task DONE in docs/TASKS.md`.

---

### Task 8: SCL-107 — AuditLog schema

**Files:**
- Create: `db/schema/audit-log.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/000X_audit_log.sql` (generated)
- Create: `db/migrations/000Y_audit_log_rls.sql` (hand-written)
- Modify: `db/migrations/meta/_journal.json`
- Create: `domain/audit/service.ts`
- Test: `tests/domain/audit.test.ts`

**Interfaces:**
- Consumes: `profiles` (P0, for `actorUserId`).
- Produces: `auditLog` table; `recordAuditEvent()` from `domain/audit/service.ts` — Epic 2's financial/status-mutation actions call this for "operações críticas" (PRD §12).

- [ ] **Step 1: Write the Drizzle schema**

Create `db/schema/audit-log.ts`:

```ts
import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id"), // nullable — null means a system/automated action
  action: text("action").notNull(), // e.g. "shoot.status_changed", "payment.created"
  entityType: text("entity_type").notNull(), // e.g. "shoot", "payment", "client"
  entityId: uuid("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
```

Update `db/schema/index.ts` to add `export * from "./audit-log";`.

- [ ] **Step 2: Generate, add FK, apply**

```powershell
npm run db:generate
```

Append:

```sql
--> statement-breakpoint
alter table "audit_log"
  add constraint "audit_log_actor_user_id_fkey"
  foreign key ("actor_user_id") references "profiles"("id");
```

```powershell
npm run db:migrate
```

Expected: exits 0.

- [ ] **Step 3: Write the RLS migration**

An audit log is an append-only record meant to be tamper-evident — unlike every other table in this plan, it gets no `for all` staff policy. Only admins can read it, and nothing is granted UPDATE/DELETE to anyone via the Data API (writes happen exclusively through the app's `DATABASE_URL`/`postgres` path, same as everywhere else in this plan, which isn't subject to RLS at all per the C4 decision — this policy only governs direct/API access):

```sql
alter table "audit_log" enable row level security;
--> statement-breakpoint

create policy "audit_log_admin_read"
  on "audit_log" for select
  using (public.is_admin());
--> statement-breakpoint

-- No insert/update/delete policy for authenticated/anon at all: RLS defaults to
-- deny when no policy matches a given command, so this table is read-only to
-- anyone going through the Data API, even admins. Writes only ever happen via
-- domain/audit/service.ts through the app's own DATABASE_URL connection.
revoke insert, update, delete on table "audit_log" from "authenticated", "anon";
```

Register in the journal, apply, verify: confirm in the dashboard that `audit_log` shows RLS enabled with exactly one policy (`audit_log_admin_read`, SELECT only).

- [ ] **Step 4: Write the failing test**

Create `tests/domain/audit.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";

describe("recordAuditEvent", () => {
  const testEntityId = "00000000-0000-0000-0000-0000000000aa";

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.entityId, testEntityId));
  });

  it("persists an audit entry with before/after snapshots", async () => {
    const entry = await recordAuditEvent({
      actorUserId: null,
      action: "shoot.status_changed",
      entityType: "shoot",
      entityId: testEntityId,
      before: { status: "reserva" },
      after: { status: "preparacao" },
    });

    expect(entry.id).toBeDefined();
    expect(entry.action).toBe("shoot.status_changed");
    expect(entry.before).toEqual({ status: "reserva" });
    expect(entry.after).toEqual({ status: "preparacao" });
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```powershell
npm run test
```

Expected: FAIL — `@/domain/audit/service` has no exports.

- [ ] **Step 6: Implement `domain/audit/service.ts`**

```ts
import { db } from "@/db/client";
import { auditLog, type AuditLogEntry } from "@/db/schema";

type RecordAuditEventInput = {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
};

export async function recordAuditEvent(input: RecordAuditEventInput): Promise<AuditLogEntry> {
  const [row] = await db
    .insert(auditLog)
    .values({
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before ?? null,
      after: input.after ?? null,
    })
    .returning();
  return row;
}
```

(No Zod schema here, deliberately — this function is called internally by other domain modules, not from untrusted user input directly, so the TypeScript type on `RecordAuditEventInput` is the validation boundary. Every other task's `create*` function in this plan validates external input with Zod because that input crosses a trust boundary from a future Server Action; this one doesn't.)

- [ ] **Step 7: Run test to verify it passes**

```powershell
npm run test
```

Expected: PASS — 1 test passed.

- [ ] **Step 8: Run the full verification suite**

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all green.

- [ ] **Step 9: Commit**

```powershell
git add db/schema/audit-log.ts db/schema/index.ts db/migrations/ domain/audit/ tests/domain/audit.test.ts
git commit -m "SCL-107: add AuditLog schema (admin-read-only, app-write-only)"
```

- [ ] **Step 10: Update `docs/TASKS.md`**

Summary row + detailed section for SCL-107, `DONE`. Also do a final pass over the whole Epic 1 section of `docs/TASKS.md`: confirm every `Depends on`/`Blocks` reference across SCL-100–SCL-108 is accurate given what actually got built (e.g. SCL-200's `Depends on: SCL-007,SCL-009` in the summary table should probably gain `SCL-100` once Epic 2 planning starts, but that's the next plan's job, not this commit's — just make sure nothing in Epic 1's own rows is now factually wrong). Commit: `SCL-107: mark task DONE in docs/TASKS.md`.

---

## Self-review notes

- **Spec coverage:** every Epic 1 backlog item (SCL-100–SCL-108) maps to a task above; SCL-108 (seed data) is folded into Task 1 per its trivial size, matching the same pattern P0 used for SCL-010. The missing SCL-101 tracked row (flagged by the P0 final review) is added by Task 3.
- **The `payment_status` tension** between PRD §7.5 ("saldo... deve ser derivado", "nunca... duplicad[o]") and `docs/reference/studio-carol-lucas-v2.3-modelo-dados.md`'s explicit `payment_status` column on Shoot is resolved by treating the column as a denormalized cache the payment-registration action (Epic 2) writes, never a second hand-entered source of truth — documented inline in Task 4's schema comment and its Implementation notes for `docs/TASKS.md`.
- **RLS scope discipline:** every table gets a staff/admin backstop per the C4 decision; client-row policies are explicitly and consistently deferred to Epic 3 across every task (Client, Shoot, PreparationTask) rather than half-built in one table and skipped in another — `clients.auth_user_id` is the one piece of schema laid down now for Epic 3 to key off later.
- **Financial testing priority:** PRD §15 names balance calculation and financial status as the top unit-testing priority in the entire product; Task 5 gives both dedicated, thorough test coverage (including the overpayment/negative-balance edge case) before any UI exists to call them.
- **Type consistency check:** `Client`/`Lead`/`Shoot`/`Payment`/`Expense`/`PreparationTask`/`ProductionJob`/`AuditLogEntry` are each defined exactly once (via Drizzle's `$inferSelect`) in their own schema file and imported everywhere else — no task redefines another task's type. FK column names (`clientId`, `shootId`, `experiencePackageId`, `editorUserId`, `actorUserId`) are consistent between the Drizzle schema, the Zod input schema, and every test across all 8 tasks.
