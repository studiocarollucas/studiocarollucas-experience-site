# Quiz de Curadoria Pública Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Criar um quiz editorial de seis escolhas que começa pela família de ensaio e recomenda um pacote ativo, com WhatsApp contextual e paleta inicial opcional.

**Architecture:** A rota /quiz é dinâmica, carrega uma projeção pública de famílias e pacotes e entrega os dados a um Client Component. Um motor de recomendação puro seleciona pacote somente dentro da família escolhida. A comparação de faixa usa preço privado no servidor; o browser e o resultado jamais recebem preço individual. Persistência em lead/cliente é SCL-404 posterior: visitante anônima não deve criar CRM sem identificação ou consentimento.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM/PostgreSQL, Zod 4, CSS Modules, Vitest and Testing Library.

## Global Constraints

- Curadoria por regras; nunca afirmar que há IA.
- Primeiro passo obrigatório é o tipo de ensaio. Recomendação nunca atravessa famílias.
- São seis escolhas principais. Paleta é opcional pós-resultado e não muda o pacote.
- Pacote requer active, published e quizEligible; família requer active e published.
- Preço individual não é serializado, renderizado ou enviado no WhatsApp.
- CTA externo usa wa.me, target _blank, rel noreferrer e alvo de 44 px.
- Não persistir resposta anônima neste marco.

---

### Task 1: Motor puro de recomendação

**Files:**
- Create: domain/quiz/recommendation.ts
- Test: tests/domain/quiz-recommendation.test.ts

**Interfaces:**
- Produces QuizAnswers, ServerQuizPackage, QuizRecommendation, PRICE_BANDS, PERSONAS and recommendPackage.
- Consumes JSON-safe input only; no Drizzle, Next or environment imports.

- [ ] **Step 1: Write failing rule tests**

~~~ts
const packages: ServerQuizPackage[] = [
  { id: "c", familySlug: "aniversario", name: "Cinderela", basePrice: "350.00", outfitsLimit: 2, sceneCount: 1, participantLimit: 1, paletteEligible: true },
  { id: "a", familySlug: "aniversario", name: "Aurora", basePrice: "590.00", outfitsLimit: 3, sceneCount: 2, participantLimit: 1, paletteEligible: true },
  { id: "d", familySlug: "aniversario", name: "Diana", basePrice: "800.00", outfitsLimit: 4, sceneCount: 3, participantLimit: 3, paletteEligible: true },
];

it("never recommends another family", () => {
  const result = recommendPackage({ ...answers, familySlug: "aniversario" }, [
    ...packages, { ...packages[0], id: "g1", familySlug: "gestante", name: "Gestante 1" },
  ]);
  expect(result.package.id).not.toBe("g1");
});

it("uses investment range before preferring a larger package", () => {
  const result = recommendPackage({ ...answers, familySlug: "aniversario", looks: "3", investment: "up-to-700" }, packages);
  expect(result.package.name).toBe("Aurora");
});

it("returns the closest price match when range has no candidate", () => {
  const result = recommendPackage({ ...answers, familySlug: "aniversario", looks: "3", investment: "up-to-500" }, packages.slice(1));
  expect(result.usedClosestBudgetMatch).toBe(true);
  expect(result.package.name).toBe("Aurora");
});
~~~

- [ ] **Step 2: Run the test and confirm RED**

Run: npx.cmd vitest run tests/domain/quiz-recommendation.test.ts --reporter=verbose --maxWorkers=1

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement fixed bands and a deterministic score**

~~~ts
export const PRICE_BANDS = [
  { id: "up-to-500", label: "Até R$ 500", maxCents: 50_000 },
  { id: "up-to-700", label: "De R$ 501 a R$ 700", minCents: 50_001, maxCents: 70_000 },
  { id: "up-to-1000", label: "De R$ 701 a R$ 1.000", minCents: 70_001, maxCents: 100_000 },
  { id: "above-1000", label: "Acima de R$ 1.000", minCents: 100_001 },
] as const;

export function recommendPackage(answers: QuizAnswers, packages: ServerQuizPackage[]) {
  const withinFamily = packages.filter((item) => item.familySlug === answers.familySlug);
  if (!withinFamily.length) throw new Error("família sem pacote elegível");
  const withinBudget = withinFamily.filter((item) => inPriceBand(item.basePrice, answers.investment));
  return chooseLowestScore(withinBudget.length ? withinBudget : withinFamily, answers, withinBudget.length === 0);
}
~~~

Use an integer decimal parser for basePrice. The score is absolute look distance plus scene distance plus participant distance; group requires participantLimit of at least 2. On tie, choose lower basePrice then alphabetical name. Aesthetic chooses persona only; it does not replace the concrete package criteria.

- [ ] **Step 4: Run focused verification**

Run: npx.cmd vitest run tests/domain/quiz-recommendation.test.ts --reporter=verbose --maxWorkers=1

Expected: PASS for cross-family exclusion, budget choice, closest fallback, tie-break and persona mapping.

- [ ] **Step 5: Commit**

~~~bash
git add domain/quiz/recommendation.ts tests/domain/quiz-recommendation.test.ts
git commit -m "feat(quiz): add deterministic package recommendation"
~~~

### Task 2: Server projection and quiz entry route

**Files:**
- Create: domain/quiz/catalog.ts
- Create: app/(site)/quiz/page.tsx
- Create: app/(site)/quiz/quiz.module.css
- Modify: app/(site)/page.tsx
- Test: tests/domain/quiz-catalog.test.ts
- Test: tests/app/quiz-page.test.tsx

**Interfaces:**
- Produces getPublicQuizCatalog for family buttons, with no package price.
- Produces recommendQuizPackageAction that validates QuizAnswers, loads private package fields server-side and returns no basePrice.
- Adds homepage CTA to /quiz.

- [ ] **Step 1: Write failing public-boundary tests**

~~~ts
it("requires active, published and quiz eligible package state", async () => {
  const source = await readFile("domain/quiz/catalog.ts", "utf8");
  expect(source).toContain("experiencePackages.active");
  expect(source).toContain("experiencePackages.published");
  expect(source).toContain("experiencePackages.quizEligible");
});

it("never selects price into the public catalog", async () => {
  const source = await readFile("domain/quiz/catalog.ts", "utf8");
  expect(source).not.toMatch(/basePrice:\s*experiencePackages\.basePrice/);
});
~~~

~~~tsx
it("renders family as the first quiz choice", async () => {
  mockPublicQuizCatalog({ families: [{ slug: "gestante", name: "Gestante" }], packages: [] });
  render(await QuizPage());
  expect(screen.getByRole("heading", { name: /qual experiência/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Gestante" })).toBeInTheDocument();
});
~~~

- [ ] **Step 2: Run and confirm RED**

Run: npx.cmd vitest run tests/domain/quiz-catalog.test.ts tests/app/quiz-page.test.tsx --reporter=verbose --maxWorkers=1

Expected: FAIL because query and route do not exist.

- [ ] **Step 3: Implement two server boundaries**

~~~ts
export async function getPublicQuizCatalog() {
  const rows = await db.select({
    familySlug: experienceFamilies.slug,
    familyName: experienceFamilies.name,
    packageId: experiencePackages.id,
    packageName: experiencePackages.name,
    outfitsLimit: experiencePackages.outfitsLimit,
    sceneCount: experiencePackages.sceneCount,
    participantLimit: experiencePackages.participantLimit,
    paletteEligible: experiencePackages.paletteEligible,
  }).from(experiencePackages)
    .innerJoin(experienceFamilies, eq(experiencePackages.familyId, experienceFamilies.id))
    .where(and(
      eq(experienceFamilies.active, true), eq(experienceFamilies.published, true),
      eq(experiencePackages.active, true), eq(experiencePackages.published, true),
      eq(experiencePackages.quizEligible, true),
    ));
  return groupQuizRows(rows);
}
~~~

The action reloads the selected family’s private basePrice, invokes the pure engine and returns only packageId, packageName, persona, styling, sceneDirection, explanation, paletteEligible and fallback flag. Add force-dynamic to the page, metadata title Quiz de curadoria | Stúdio Carol Lucas, semantic main landmark and accessible skip link.

- [ ] **Step 4: Add visual entrypoint**

Use existing Cormorant/Jost and cream/ink/wine tokens. Do not add dependencies, gradients, stock imagery or price cards. Add “Descubra a sua curadoria” linking to /quiz between the home experience gallery and preparation section.

- [ ] **Step 5: Run route verification**

Run: npx.cmd vitest run tests/domain/quiz-catalog.test.ts tests/app/quiz-page.test.tsx --reporter=verbose --maxWorkers=1; npm.cmd run typecheck; npm.cmd run build

Expected: PASS, TypeScript 0 errors and build includes /quiz without a static database snapshot.

- [ ] **Step 6: Commit**

~~~bash
git add domain/quiz/catalog.ts app/(site)/quiz/page.tsx app/(site)/quiz/quiz.module.css app/(site)/page.tsx tests/domain/quiz-catalog.test.ts tests/app/quiz-page.test.tsx
git commit -m "feat(site): add public quiz catalog entrypoint"
~~~

### Task 3: Six-step editorial flow and result

**Files:**
- Create: components/site/quiz/quiz-flow.tsx
- Create: components/site/quiz/quiz-result.tsx
- Create: components/site/quiz/quiz-copy.ts
- Modify: app/(site)/quiz/page.tsx
- Modify: app/(site)/quiz/quiz.module.css
- Test: tests/components/quiz-flow.test.tsx

**Interfaces:**
- Produces QuizFlow and QuizResult.
- Uses action output only; client state contains no package price.
- Preserves choices when visitor navigates backward.

- [ ] **Step 1: Write failing interaction tests**

~~~tsx
it("starts with type and blocks continuation without a choice", async () => {
  render(<QuizFlow families={[{ slug: "newborn", name: "Newborn" }]} />);
  expect(screen.getByText("Passo 1 de 6")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Newborn" }));
  expect(screen.getByRole("button", { name: /continuar/i })).toBeEnabled();
});

it("keeps the family choice after back navigation", async () => {
  // select family, continue, select Voltar; assert family button aria-pressed is true
});

it("does not render a price in a completed result", async () => {
  // complete six mocked responses; assert screen.queryByText(/R\$/) is null
});
~~~

- [ ] **Step 2: Run and confirm RED**

Run: npx.cmd vitest run tests/components/quiz-flow.test.tsx --reporter=verbose --maxWorkers=1

Expected: FAIL because the flow does not exist.

- [ ] **Step 3: Implement exact questions and accessible navigation**

~~~ts
const STEPS = [
  { id: "familySlug", title: "Qual experiência você quer viver?" },
  { id: "aesthetic", title: "Qual universo visual mais parece com você?", values: ["romantica", "classica", "intensa", "eterea"] },
  { id: "feeling", title: "Como você quer se sentir quando olhar as fotos?", values: ["delicada", "poderosa", "atemporal", "magica"] },
  { id: "production", title: "Quanto você quer transformar o espaço ao seu redor?", values: ["clean", "textura", "elaborado", "imersivo"] },
  { id: "looks", title: "Quantas versões de você quer explorar?", values: ["1", "2", "3", "group"] },
  { id: "investment", title: "Qual faixa de investimento faz sentido para você?", values: ["up-to-500", "up-to-700", "up-to-1000", "above-1000"] },
] as const;
~~~

Use buttons with aria-pressed, numeric progressbar attributes, 44 px back/continue controls, focus-visible styling and a Refazer control that clears all answers. Never say AI. Result loading and completed result use aria-live polite.

- [ ] **Step 4: Render persona and recommendation without price**

Show heading Sua curadoria, persona title/text, styling, scenario direction, package name and one explanation:

~~~ts
const matchCopy = "Suas escolhas de produção, looks e investimento apontam para esta experiência como a melhor forma de viver o ensaio.";
const closestCopy = "Esta é a experiência mais próxima das suas escolhas. Na conversa, vamos encontrar a melhor forma de adaptar os detalhes ao seu momento.";
~~~

- [ ] **Step 5: Run focused test**

Run: npx.cmd vitest run tests/components/quiz-flow.test.tsx --reporter=verbose --maxWorkers=1

Expected: PASS for required choice, six steps, preserved back state, ARIA progress and no price render.

- [ ] **Step 6: Commit**

~~~bash
git add components/site/quiz/quiz-flow.tsx components/site/quiz/quiz-result.tsx components/site/quiz/quiz-copy.ts app/(site)/quiz/page.tsx app/(site)/quiz/quiz.module.css tests/components/quiz-flow.test.tsx
git commit -m "feat(site): add six-step editorial quiz"
~~~

### Task 4: Optional palette and contextual WhatsApp

**Files:**
- Modify: lib/site/contact.ts
- Modify: components/site/quiz/quiz-flow.tsx
- Modify: components/site/quiz/quiz-result.tsx
- Modify: app/(site)/quiz/quiz.module.css
- Test: tests/lib/quiz-contact.test.ts
- Test: tests/components/quiz-result.test.tsx

**Interfaces:**
- Produces quizContactUrl(context).
- Consumes optional palette choice or trimmed 160-character custom color.

- [ ] **Step 1: Write failing palette and contact tests**

~~~ts
it("puts package and palette in a valid wa.me URL", () => {
  const url = new URL(quizContactUrl({
    familyName: "Aniversário", packageName: "Aurora", persona: "Romântica Editorial",
    production: "Cenário elaborado", looks: "Três ou mais looks",
    investment: "De R$ 501 a R$ 700", palette: "Rosé e românticos",
  }));
  expect(url.hostname).toBe("wa.me");
  expect(url.searchParams.get("text")).toContain("Aurora");
  expect(url.searchParams.get("text")).toContain("Rosé e românticos");
});

it("shows palette only for an eligible package", () => {
  render(<QuizResult result={{ ...result, paletteEligible: false }} />);
  expect(screen.queryByText(/paleta inicial/i)).not.toBeInTheDocument();
});
~~~

- [ ] **Step 2: Run and confirm RED**

Run: npx.cmd vitest run tests/lib/quiz-contact.test.ts tests/components/quiz-result.test.tsx --reporter=verbose --maxWorkers=1

Expected: FAIL because palette gating and contextual contact do not exist.

- [ ] **Step 3: Implement optional palette and safe URL**

Choices are exactly Tons claros e delicados, Rosé e românticos, Vibrantes e intensos, Neutros e atemporais and Outra cor que imagino. The last opens a maxLength 160 input; trim input and never use dangerouslySetInnerHTML.

~~~ts
url.searchParams.set("text", [
  "Olá! Fiz a curadoria no site do Stúdio Carol Lucas.",
  "Ensaio: " + context.familyName,
  "Pacote recomendado: " + context.packageName,
  "Estética: " + context.persona,
  "Produção: " + context.production,
  "Looks: " + context.looks,
  "Faixa escolhida: " + context.investment,
  context.palette ? "Paleta inicial: " + context.palette : null,
].filter(Boolean).join("\n"));
~~~

Only render palette for paletteEligible packages. Primary CTA opens this URL; Refazer clears palette and answers.

- [ ] **Step 4: Run focused tests and all gates**

Run: npx.cmd vitest run tests/lib/quiz-contact.test.ts tests/components/quiz-result.test.tsx --reporter=verbose --maxWorkers=1; npm.cmd run test; npm.cmd run typecheck; npm.cmd run lint; npm.cmd run build; git diff --check

Expected: focused and full tests pass, build/typecheck pass, no new lint warning and no whitespace error.

- [ ] **Step 5: Manual responsive QA**

At 390 px and 1440 px, test all six steps, each investment range, back navigation, result with no price, non-eligible palette absence, eligible palette keyboard path, WhatsApp text, focus rings and prefers-reduced-motion.

- [ ] **Step 6: Commit**

~~~bash
git add lib/site/contact.ts components/site/quiz/quiz-flow.tsx components/site/quiz/quiz-result.tsx app/(site)/quiz/quiz.module.css tests/lib/quiz-contact.test.ts tests/components/quiz-result.test.tsx
git commit -m "feat(quiz): send palette-aware WhatsApp context"
~~~

### Task 5: Document scope boundary

**Files:**
- Modify: docs/TASKS.md
- Modify: docs/DECISIONS.md

- [ ] **Step 1: Record delivered and deferred work**

Mark SCL-403 DONE only after Task 4 gates. Keep SCL-404 explicit: consented persistence to lead/client is later; anonymous discovery creates no CRM record.

- [ ] **Step 2: Record public/private decision**

Add: server matches the price range through private base price; client receives no individual price and result includes only selected range plus recommended package.

- [ ] **Step 3: Verify and commit**

Run: git diff --check; git status --short --branch

~~~bash
git add docs/TASKS.md docs/DECISIONS.md
git commit -m "docs: record quiz discovery boundary"
~~~

