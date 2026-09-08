# SCL-404/405 — Quiz Acquisition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir a curadoria como Lead apenas com consentimento e rastrear o CTA contextual de WhatsApp sem PII.

**Architecture:** Uma Server Action valida captura consentida e chama `createLead()`. A UI de resultado permanece cliente e exibe um formulário opcional; o módulo de eventos recebe apenas nomes de evento e origem.

**Tech Stack:** Next.js Server Actions, React 19, Zod, Drizzle, Vitest.

## Global Constraints

- Não criar Client, conta ou sessão a partir do Quiz.
- Sem consentimento, nenhuma identificação ou resultado é persistido.
- `quizResult` contém somente curadoria; eventos não levam nome, e-mail, telefone ou URL do WhatsApp.
- Não editar `domain/leads/detail.ts` nem rotas Admin de Leads.

---

### Task 1: Contrato consentido e Server Action

**Files:**
- Create: `domain/quiz/lead-capture.ts`
- Modify: `app/(site)/quiz/actions.ts`
- Create: `tests/domain/quiz-lead-capture.test.ts`
- Create: `tests/app/quiz-actions.test.ts`

**Interfaces:**
- Produces `captureQuizLead(input)` and `captureQuizLeadAction(input)`.
- Input: `{ consent: true; name: string; email: string; phone?: string; result: PublicQuizRecommendation; answers: QuizAnswers }`.

- [ ] **Step 1: Write failing consent tests**

```ts
it("does not call createLead when consent is false", async () => {
  await expect(captureQuizLead({ consent: false, ...validInput })).resolves.toEqual({ created: false });
  expect(createLead).not.toHaveBeenCalled();
});
it("creates a quiz Lead only after valid consent", async () => {
  await captureQuizLead({ consent: true, ...validInput });
  expect(createLead).toHaveBeenCalledWith(expect.objectContaining({ source: "quiz", quizResult: expect.stringContaining(validInput.result.persona) }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/quiz-lead-capture.test.ts tests/app/quiz-actions.test.ts --reporter=verbose --maxWorkers=1`

Expected: FAIL because the capture API is absent.

- [ ] **Step 3: Write minimal implementation**

```ts
export const quizLeadCaptureSchema = z.object({
  consent: z.literal(true), name: z.string().trim().min(2).max(120),
  email: z.string().email(), phone: z.string().trim().max(40).optional(),
  result: z.object({ packageId: z.string().uuid(), packageName: z.string(), familyName: z.string(), persona: z.string(), paletteEligible: z.boolean(), usedClosestBudgetMatch: z.boolean() }).passthrough(),
  answers: z.object({ familySlug: z.string().min(1), aesthetic: z.enum(["romantica", "classica", "intensa", "eterea"]), feeling: z.enum(["delicada", "poderosa", "atemporal", "magica"]), production: z.enum(["clean", "textura", "elaborado", "imersivo"]), looks: z.enum(["1", "2", "3", "group"]), investment: z.enum(["up-to-500", "up-to-700", "up-to-1000", "above-1000"]) }),
});
```

Serialize persona, package, family and selected answers into JSON; call `createLead({ source: "quiz", ... })`; return only `{ created: true }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/quiz-lead-capture.test.ts tests/app/quiz-actions.test.ts --reporter=verbose --maxWorkers=1`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add domain/quiz/lead-capture.ts app/(site)/quiz/actions.ts tests/domain/quiz-lead-capture.test.ts tests/app/quiz-actions.test.ts
git commit -m "feat: capture consented quiz leads"
```

### Task 2: Captura opcional, WhatsApp e evento seguro

**Files:**
- Create: `lib/site/analytics.ts`
- Modify: `components/site/quiz/quiz-flow.tsx`
- Modify: `components/site/quiz/quiz-result.tsx`
- Modify: `app/(site)/quiz/quiz.module.css`
- Modify: `tests/components/quiz-result.test.tsx`

**Interfaces:**
- Consumes `captureQuizLeadAction()` from Task 1.
- Produces `trackPublicEvent({ name: "quiz_lead_created" | "quiz_whatsapp_clicked"; source: "quiz" })`.

- [ ] **Step 1: Write failing UI/event tests**

```tsx
it("keeps contact capture optional and does not submit without consent", async () => {
  render(<QuizResult {...props} captureLead={captureLead} />);
  expect(captureLead).not.toHaveBeenCalled();
});
it("tracks WhatsApp context without passing contact fields", () => {
  fireEvent.click(screen.getByRole("link", { name: /WhatsApp/i }));
  expect(trackPublicEvent).toHaveBeenCalledWith({ name: "quiz_whatsapp_clicked", source: "quiz" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/quiz-result.test.tsx --reporter=verbose --maxWorkers=1`

Expected: FAIL because capture props and event module are absent.

- [ ] **Step 3: Write minimal implementation**

Use a labelled checkbox, submit disabled until checked, and success/error messages. `trackPublicEvent` accepts only the literal fields above and is a no-op until SCL-406 configures a provider.

- [ ] **Step 4: Run Quiz regressions**

Run: `npx vitest run tests/components/quiz-flow.test.tsx tests/components/quiz-result.test.tsx tests/lib/quiz-contact.test.ts tests/domain/quiz-lead-capture.test.ts --reporter=verbose --maxWorkers=1`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/site/quiz app/(site)/quiz/quiz.module.css lib/site/analytics.ts tests/components/quiz-result.test.tsx
git commit -m "feat: add consented quiz contact capture"
```
