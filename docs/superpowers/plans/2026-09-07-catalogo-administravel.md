# Catálogo Administrável Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Permitir que a equipe mantenha famílias e pacotes de experiência no Studio OS, sem quebrar ensaios já registrados.

**Architecture:** Introduzir \`experience_families\` como a camada comercial acima de \`experience_packages\`, mantendo \`shoots.experience_package_id\` intacto. Estender o pacote com atributos estruturados usados pelo quiz e criar duas projeções: o admin recebe preço-base; o site receberá depois uma projeção sem preço.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM/PostgreSQL, Zod 4, Supabase RLS, Tailwind 4, Vitest.

## Global Constraints

- Nunca usar \`drizzle-kit push\`; gerar migration, revisar SQL e só então usar \`npm run db:migrate\`.
- Não apagar pacote: um \`Shoot\` continua referenciando seu pacote mesmo quando ele deixa de ser ativo.
- Dinheiro é string decimal \`numeric(10,2)\`; não usar \`number\` ou \`parseFloat\` para preço.
- Escritas do admin usam \`defineAdminAction\`, RBAC \`staff\`, \`recordAuditEvent\` e \`revalidatePath\`.
- Componentes \`"use client"\` importam \`ActionResult\` e \`toFormAction\` apenas de \`@/lib/auth/action-result\`.
- A tabela não receberá acesso direto do browser: nenhuma projeção pública inclui \`basePrice\`.
- Preço individual não aparece no site. \`active\`, \`published\` e \`quizEligible\` são controles independentes.

---

### Task 1: Modelar famílias e enriquecer pacotes

**Files:**
- Create: \`db/schema/experience-families.ts\`
- Create: \`db/migrations/0032_catalog_families_and_package_fields.sql\`
- Create: \`domain/catalog/family.ts\`
- Modify: \`db/schema/experience-packages.ts\`
- Modify: \`db/schema/index.ts\`
- Modify: \`domain/catalog/experience-package.ts\`
- Test: \`tests/domain/experience-package.test.ts\`
- Test: \`tests/db/catalog-migration.test.ts\`

**Interfaces:**
- Produces \`experienceFamilies\` with \`id, name, slug, description, sortOrder, active, published, createdAt\`.
- Produces package fields \`familyId, description, sortOrder, sceneCount, participantLimit, videoCount, hairIncluded, paletteEligible, published, quizEligible\`.
- Produces \`createExperienceFamilySchema\`, \`updateExperienceFamilySchema\`, \`createExperiencePackageSchema\`, \`updateExperiencePackageSchema\`.

- [ ] **Step 1: Write the failing schema and migration-contract tests**

\`\`\`ts
it("accepts a quiz-eligible package with structured recommendation fields", () => {
  const result = createExperiencePackageSchema.safeParse({
    familyId: "f2111111-1111-4111-8111-111111111111",
    name: "Debutante 2", basePrice: "599.00", includedPhotos: 20, durationMinutes: 60,
    outfitsLimit: 3, sceneCount: 2, participantLimit: 1, videoCount: 1,
    makeIncluded: true, hairIncluded: true, paletteEligible: true,
    active: true, published: true, quizEligible: true,
  });
  expect(result.success).toBe(true);
});

it("rejects a package marked for the quiz without a family", () => {
  expect(createExperiencePackageSchema.safeParse({
    name: "Sem família", basePrice: "499.00", includedPhotos: 15,
    durationMinutes: 50, quizEligible: true,
  }).success).toBe(false);
});

it("creates families and does not delete existing packages", async () => {
  const sql = await readFile("db/migrations/0032_catalog_families_and_package_fields.sql", "utf8");
  expect(sql).toContain('create table "experience_families"');
  expect(sql).toContain('add column "family_id"');
  expect(sql).not.toMatch(/delete from\s+"experience_packages"/i);
});
\`\`\`

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: \`npx.cmd vitest run tests/domain/experience-package.test.ts tests/db/catalog-migration.test.ts --reporter=verbose --maxWorkers=1\`

Expected: FAIL because the family schema, package fields and migration do not exist.

- [ ] **Step 3: Add Drizzle schemas and a non-destructive migration**

\`\`\`ts
export const experienceFamilies = pgTable("experience_families", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
\`\`\`

The migration must create a unique family slug and add nullable \`family_id uuid\` to existing packages, then add \`description text\`, \`sort_order integer not null default 0\`, \`scene_count integer\`, \`participant_limit integer\`, \`video_count integer not null default 0\`, \`hair_included boolean not null default false\`, \`palette_eligible boolean not null default false\`, \`published boolean not null default false\` and \`quiz_eligible boolean not null default false\`.

Add the FK \`experience_packages_family_id_experience_families_id_fk\` with \`on delete restrict\`, an \`experience_packages_family_name_unique\` unique constraint, RLS to \`experience_families\` and a staff/admin all-access policy using \`public.is_staff_or_admin()\`. Keep \`family_id\` nullable: an incomplete legacy package remains valid for historical Shoots but cannot become quiz-eligible.

- [ ] **Step 4: Implement strict domain schemas**

\`\`\`ts
const decimal = z.string().regex(/^\d+(\.\d{1,2})?$/);
const optionalPositiveInt = z.number().int().positive().optional();

export const createExperiencePackageSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  basePrice: decimal,
  includedPhotos: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  outfitsLimit: optionalPositiveInt, sceneCount: optionalPositiveInt,
  participantLimit: optionalPositiveInt, videoCount: z.number().int().min(0).default(0),
  makeIncluded: z.boolean().default(false), hairIncluded: z.boolean().default(false),
  clutchIncluded: z.boolean().default(false), paletteEligible: z.boolean().default(false),
  active: z.boolean().default(true), published: z.boolean().default(false),
  quizEligible: z.boolean().default(false), sortOrder: z.number().int().min(0).default(0),
}).superRefine((value, ctx) => {
  if (value.quizEligible && (!value.active || !value.published)) {
    ctx.addIssue({ code: "custom", path: ["quizEligible"], message: "Pacote do quiz precisa estar ativo e publicado." });
  }
});
\`\`\`

Make the update schemas partial and run the same cross-field rule when \`quizEligible\` becomes true. The family slug uses \`/^[a-z0-9]+(?:-[a-z0-9]+)*$/\`.

- [ ] **Step 5: Run focused tests and guards**

Run: \`npx.cmd vitest run tests/domain/experience-package.test.ts tests/db/catalog-migration.test.ts --reporter=verbose --maxWorkers=1; npm.cmd run predb:migrate; npm.cmd run typecheck\`

Expected: all tests pass, migration journal exits 0, TypeScript has 0 errors.

- [ ] **Step 6: Commit**

\`\`\`bash
git add db/schema/experience-families.ts db/schema/experience-packages.ts db/schema/index.ts db/migrations/0032_catalog_families_and_package_fields.sql domain/catalog/family.ts domain/catalog/experience-package.ts tests/domain/experience-package.test.ts tests/db/catalog-migration.test.ts
git commit -m "feat(catalog): add families and quiz package fields"
\`\`\`

### Task 2: Popular o catálogo inicial e criar consultas seguras

**Files:**
- Create: \`db/seeds/catalog.ts\`
- Modify: \`package.json\`
- Modify: \`domain/catalog/queries.ts\`
- Test: \`tests/domain/catalog-queries.test.ts\`
- Test: \`tests/db/catalog-seed.test.ts\`

**Interfaces:**
- Produces \`listCatalogPackages(): Promise<CatalogPackageRow[]>\` for o admin, com preço e família.
- Produces \`listActivePackages(): Promise<{id:string;name:string;familyName:string}[]>\` for novo ensaio.
- Produces idempotent \`seedCatalog()\`, run by \`npm run db:seed:catalog\`.

- [ ] **Step 1: Write failing seed and ordering tests**

\`\`\`ts
it("orders active package options by family then package order", () => {
  expect(sortPackageOptions([
    { familySortOrder: 2, packageSortOrder: 1, name: "Gestante 1" },
    { familySortOrder: 1, packageSortOrder: 2, name: "Debutante 2" },
  ]).map((item) => item.name)).toEqual(["Debutante 2", "Gestante 1"]);
});

it("declares public families without overwriting existing package names", async () => {
  const source = await readFile("db/seeds/catalog.ts", "utf8");
  expect(source).toContain('slug: "15-anos"');
  expect(source).toContain('slug: "newborn"');
  expect(source).toContain("onConflictDoNothing");
  expect(source).not.toContain(".set({ name:");
});
\`\`\`

- [ ] **Step 2: Run and confirm RED**

Run: \`npx.cmd vitest run tests/domain/catalog-queries.test.ts tests/db/catalog-seed.test.ts --reporter=verbose --maxWorkers=1\`

Expected: FAIL because seed and ordering helper do not exist.

- [ ] **Step 3: Implement the idempotent initial catalog**

Insert these families, in this order: \`15 anos / Debutante\` (\`15-anos\`, published), \`Aniversário\` (\`aniversario\`, published), \`Gestante\` (\`gestante\`, published), \`Newborn\` (\`newborn\`, published), \`Casal / Namorados\` (\`casal\`, draft), \`Formatura\` (\`formatura\`, draft), \`Marca pessoal\` (\`marca-pessoal\`, draft) and \`Corporativo\` (\`corporativo\`, draft).

Seed only source-confirmed package data:

\`\`\`ts
const initialPackages = [
  ["15-anos", "Debutante 1", "499.00", 15, 50, 2],
  ["15-anos", "Debutante 2", "599.00", 20, 60, 3],
  ["15-anos", "Debutante 3", "799.00", 30, 60, 4],
  ["15-anos", "Debutante 4 Duo", "1500.00", 40, 100, 4],
  ["gestante", "Gestante 1", "550.00", 15, 50, 1],
  ["gestante", "Gestante 2", "650.00", 20, 80, 2],
  ["gestante", "Gestante 3", "899.00", 30, 90, 2],
  ["newborn", "Newborn 1", "480.00", 15, 120, null],
  ["newborn", "Newborn 2", "780.00", 25, 180, null],
  ["newborn", "Newborn 3", "1500.00", 35, 180, null],
  ["newborn", "Gestante + Newborn", "1900.00", 40, 210, 2],
  ["aniversario", "Cinderela", "350.00", 15, 50, 2],
  ["aniversario", "Aurora", "590.00", 30, 50, 3],
  ["aniversario", "Diana", "800.00", 40, 80, 4],
  ["casal", "Namorados 1", "350.00", 15, 50, 2],
  ["casal", "Namorados 2", "550.00", 25, 50, 1],
  ["formatura", "Formatura 1", "500.00", 15, 50, 2],
  ["formatura", "Formatura 2", "650.00", 25, 50, 2],
  ["formatura", "Formatura 3", "800.00", 35, 60, 3],
  ["marca-pessoal", "Essencial", "490.00", 15, 40, 2],
  ["marca-pessoal", "Majestic", "590.00", 25, 50, 3],
  ["marca-pessoal", "Divine", "750.00", 40, 120, 5],
  ["corporativo", "Corporativo 1", "550.00", 15, 50, 1],
  ["corporativo", "Corporativo 2", "580.00", 25, 50, 3],
  ["corporativo", "Corporativo 3", "899.00", 35, 50, 4],
] as const;
\`\`\`

Use \`onConflictDoNothing\` against family slug and package family/name. Attach the legacy \`Bella\` row, if present, to Aniversário but retain it inactive and outside the quiz until staff completes it.

- [ ] **Step 4: Implement projections**

\`\`\`ts
export type CatalogPackageRow = {
  id: string; familyId: string | null; familyName: string | null; name: string;
  basePrice: string; outfitsLimit: number | null; active: boolean; published: boolean; quizEligible: boolean;
};

export async function listActivePackages(): Promise<{ id: string; name: string; familyName: string }[]> {
  // select explicit safe fields; active packages with a non-null family only;
  // order by family.sortOrder, package.sortOrder and name
}
\`\`\`

\`listCatalogPackages\` selects explicit admin fields and left joins families. \`listActivePackages\` does not return price.

- [ ] **Step 5: Verify and apply only after real-DB authorization**

Run non-live: \`npx.cmd vitest run tests/domain/catalog-queries.test.ts tests/db/catalog-seed.test.ts --reporter=verbose --maxWorkers=1\`

After authorization: \`npm.cmd run db:migrate; npm.cmd run db:seed:catalog\`

Verify through a direct SQL read that all eight families exist, legacy package rows remain, every public quiz package has a family and non-zero base price, and no name was overwritten.

- [ ] **Step 6: Commit**

\`\`\`bash
git add db/migrations/0032_catalog_families_and_package_fields.sql db/seeds/catalog.ts package.json domain/catalog/queries.ts tests/domain/catalog-queries.test.ts tests/db/catalog-seed.test.ts
git commit -m "feat(catalog): seed curated package families"
\`\`\`

### Task 3: Criar administração de famílias e pacotes

**Files:**
- Create: \`domain/catalog/actions.ts\`
- Create: \`components/admin/catalog/family-form.tsx\`
- Create: \`components/admin/catalog/package-form.tsx\`
- Create: \`app/admin/(protected)/pacotes/page.tsx\`
- Create: \`app/admin/(protected)/pacotes/familias/page.tsx\`
- Create: \`app/admin/(protected)/pacotes/novo/page.tsx\`
- Create: \`app/admin/(protected)/pacotes/[id]/page.tsx\`
- Modify: \`components/admin/admin-nav.tsx\`
- Test: \`tests/domain/catalog-actions.test.ts\`
- Test: \`tests/components/admin-package-form.test.tsx\`

**Interfaces:**
- Produces create/update actions for family and package. No delete action is produced.
- Produces \`PackageForm({families, initialValues?})\` and \`FamilyForm({initialValues?})\`.

- [ ] **Step 1: Write failing authorization and form tests**

\`\`\`tsx
it("rejects a package action for a client role", async () => {
  mockCurrentUser({ role: "client" });
  await expect(createExperiencePackageAction(validPackage)).resolves.toMatchObject({ ok: false });
});

it("shows quiz and look controls", () => {
  render(<PackageForm families={[{ id: "f1", name: "Gestante" }]} />);
  expect(screen.getByLabelText("Disponível no quiz")).toBeInTheDocument();
  expect(screen.getByLabelText("Limite de looks / trocas")).toBeInTheDocument();
});
\`\`\`

- [ ] **Step 2: Run and confirm RED**

Run: \`npx.cmd vitest run tests/domain/catalog-actions.test.ts tests/components/admin-package-form.test.tsx --reporter=verbose --maxWorkers=1\`

Expected: FAIL because actions and forms do not exist.

- [ ] **Step 3: Implement actions with audit and revalidation**

\`\`\`ts
export const updateExperiencePackageAction = defineAdminAction(
  { role: "staff", input: updateExperiencePackageSchema.extend({ id: z.string().uuid() }) },
  async ({ id, ...patch }, ctx) => {
    const before = await getExperiencePackageById(id);
    if (!before) throw new Error("pacote inexistente");
    const after = await updateExperiencePackage(id, patch);
    await recordAuditEvent({
      actorUserId: ctx.user.id, action: "experience_package.updated",
      entityType: "experience_package", entityId: id, before, after,
    });
    revalidatePath("/admin/pacotes");
    revalidatePath("/admin/agenda/novo");
    return { id };
  },
);
\`\`\`

Implement equivalent create/update auditing for families. Deactivating a family with active packages returns a neutral action error; the staff member must deactivate its packages first.

- [ ] **Step 4: Implement accessible admin pages**

Use existing \`DataTable\`, \`PageHeader\`, \`Card\`, \`Badge\`, \`EmptyState\`, \`Field\`, \`Input\`, \`Select\`, \`Textarea\` and \`SubmitButton\` components. The package list offers “Novo pacote” and “Gerenciar famílias”; each row exposes Editar, active, published and quiz status.

\`\`\`ts
toFormAction(action, {
  numbers: ["includedPhotos", "durationMinutes", "outfitsLimit", "sceneCount", "participantLimit", "videoCount", "sortOrder"],
  booleans: ["makeIncluded", "hairIncluded", "clutchIncluded", "paletteEligible", "active", "published", "quizEligible"],
});
\`\`\`

Add \`{ href: "/admin/pacotes", label: "Pacotes" }\` after Agenda in \`AdminNav\`. Every input uses a visible \`Field\` label, constraint error and native min value.

- [ ] **Step 5: Verify focused gates**

Run: \`npx.cmd vitest run tests/domain/catalog-actions.test.ts tests/components/admin-package-form.test.tsx --reporter=verbose --maxWorkers=1; npm.cmd run check:admin-auth; npm.cmd run typecheck\`

Expected: tests pass, RBAC guard is OK, TypeScript has 0 errors.

- [ ] **Step 6: Commit**

\`\`\`bash
git add domain/catalog/actions.ts domain/catalog/family.ts domain/catalog/experience-package.ts components/admin/catalog app/admin/(protected)/pacotes components/admin/admin-nav.tsx tests/domain/catalog-actions.test.ts tests/components/admin-package-form.test.tsx
git commit -m "feat(admin): manage experience families and packages"
\`\`\`

### Task 4: Integrar criação de ensaio e fechar qualidade

**Files:**
- Modify: \`app/admin/(protected)/agenda/novo/new-shoot-form.tsx\`
- Modify: \`app/admin/(protected)/agenda/novo/page.tsx\`
- Modify: \`docs/TASKS.md\`
- Modify: \`docs/DECISIONS.md\`
- Test: \`tests/components/admin-new-shoot-form.test.tsx\`

**Interfaces:**
- Consumes \`listActivePackages(): Promise<{id:string;name:string;familyName:string}[]>\`.
- Leaves \`createShootAction\` input unchanged; only the option label changes.

- [ ] **Step 1: Write the regression test**

\`\`\`tsx
it("shows the family in the new Shoot package selector", () => {
  render(<NewShootForm clients={[{ id: "c1", name: "Ana" }]} packages={[
    { id: "p1", name: "Gestante 2", familyName: "Gestante" },
  ]} />);
  expect(screen.getByRole("option", { name: "Gestante — Gestante 2" })).toBeInTheDocument();
});
\`\`\`

- [ ] **Step 2: Run and confirm RED**

Run: \`npx.cmd vitest run tests/components/admin-new-shoot-form.test.tsx --reporter=verbose --maxWorkers=1\`

Expected: FAIL because form props still have only \`id,name\`.

- [ ] **Step 3: Implement the safe label and document the decision**

\`\`\`tsx
<option key={p.id} value={p.id}>{p.familyName} — {p.name}</option>
\`\`\`

Mark the catalog task DONE in \`docs/TASKS.md\`. In \`docs/DECISIONS.md\`, document “package deactivation instead of deletion protects Shoot history”.

- [ ] **Step 4: Run complete non-live verification**

Run: \`npm.cmd run test; npm.cmd run typecheck; npm.cmd run lint; npm.cmd run check:admin-auth; npm.cmd run build; git diff --check\`

Expected: all tests pass; typecheck, build and admin guard exit 0; no new lint warnings; diff check emits no whitespace errors.

- [ ] **Step 5: Verify the real admin journey**

With a staff account, create a draft family and package, edit it to active/published/quiz eligible, confirm status labels, then verify the family-prefixed option in \`/admin/agenda/novo\`. Do not delete any record.

- [ ] **Step 6: Commit**

\`\`\`bash
git add app/admin/(protected)/agenda/novo/new-shoot-form.tsx app/admin/(protected)/agenda/novo/page.tsx docs/TASKS.md docs/DECISIONS.md tests/components/admin-new-shoot-form.test.tsx
git commit -m "feat(catalog): show family context when creating shoots"
\`\`\`
