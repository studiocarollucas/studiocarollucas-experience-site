# SCL-251/252 — Operação do Lead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar ficha protegida de Lead e transições auditáveis do funil comercial.

**Architecture:** Consultas detalhadas e comandos de status ficam em módulos de Lead; a rota Admin só coordena autorização e apresentação. A atualização e o evento de auditoria usam o mesmo serviço de domínio, impedindo gravações diretas da UI.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle, PostgreSQL/Supabase, Zod, Vitest.

## Global Constraints

- Não criar migration; `leads.lost_reason` e `audit_log` já existem.
- Proteger leitura e mutação por `getCurrentUser()` + `hasMinimumRole(role, "staff")`.
- Reutilizar `canTransitionLeadStatus()`; entrar em `perdido` exige `lostReason` não vazio.
- Não editar os arquivos do Quiz nem o contrato `createLead()`.

---

### Task 1: Detalhe e transição de domínio

**Files:**
- Create: `domain/leads/detail.ts`
- Create: `tests/domain/lead-detail.test.ts`
- Modify: `domain/leads/schema.ts`

**Interfaces:**
- Produces `getLeadDetail(id: string)` e `transitionLeadStatus(input)`.
- `transitionLeadStatus` recebe `{ leadId, actorUserId, status, lostReason? }` e retorna o Lead atualizado.

- [ ] **Step 1: Write the failing tests**

```ts
it("rejects a lost transition without a reason", async () => {
  await expect(transitionLeadStatus({ leadId: "lead-1", actorUserId: "staff-1", status: "perdido" }))
    .rejects.toThrow("Informe o motivo da perda");
});
it("records before and after when a valid transition succeeds", async () => {
  await transitionLeadStatus({ leadId: "lead-1", actorUserId: "staff-1", status: "contato" });
  expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "lead.status_changed", entityType: "lead" }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/lead-detail.test.ts --reporter=verbose --maxWorkers=1`

Expected: FAIL because `transitionLeadStatus` is absent.

- [ ] **Step 3: Write minimal implementation**

```ts
export const transitionLeadStatusSchema = z.object({
  leadId: z.string().uuid(), actorUserId: z.string().uuid(),
  status: z.enum(leadStatusValues), lostReason: z.string().trim().max(500).optional(),
});
export async function transitionLeadStatus(input: TransitionLeadStatusInput) {
  const current = await getLeadById(input.leadId);
  if (!current || !canTransitionLeadStatus(current.status, input.status)) throw new Error("Transição de Lead inválida");
  if (input.status === "perdido" && !input.lostReason) throw new Error("Informe o motivo da perda");
  const [updated] = await db.update(leads).set({ status: input.status, lostReason: input.status === "perdido" ? input.lostReason : null }).where(eq(leads.id, input.leadId)).returning();
  await recordAuditEvent({ actorUserId: input.actorUserId, action: "lead.status_changed", entityType: "lead", entityId: updated.id, before: { status: current.status, lostReason: current.lostReason }, after: { status: updated.status, lostReason: updated.lostReason } });
  return updated;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/lead-detail.test.ts --reporter=verbose --maxWorkers=1`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add domain/leads/detail.ts domain/leads/schema.ts tests/domain/lead-detail.test.ts
git commit -m "feat: add audited lead transitions"
```

### Task 2: Ficha Admin e ações protegidas

**Files:**
- Create: `app/admin/(protected)/leads/[id]/page.tsx`
- Create: `app/admin/(protected)/leads/[id]/actions.ts`
- Create: `components/admin/lead-detail.tsx`
- Create: `tests/app/admin-lead-detail-page.test.tsx`

**Interfaces:**
- Consumes `getLeadDetail()` and `transitionLeadStatus()` from Task 1.
- Produces a staff/admin page at `/admin/leads/[id]` and `transitionLeadStatusAction(formData)`.

- [ ] **Step 1: Write failing route tests**

```tsx
it("redirects a client before loading a Lead", async () => {
  mockedGetCurrentUser.mockResolvedValue({ id: "client-1", role: "client" });
  await expect(LeadDetailPage({ params: Promise.resolve({ id: "lead-1" }) })).rejects.toThrow("REDIRECT:/admin/login");
});
it("renders contact, quiz result and valid status action for staff", async () => {
  mockedGetLeadDetail.mockResolvedValue({ id: "lead-1", name: "Maria", status: "novo", source: "quiz", quizResult: "Romântica", phone: null, email: "maria@example.test", lostReason: null, owner: null, createdAt: new Date(), audit: [] });
  render(await LeadDetailPage({ params: Promise.resolve({ id: "lead-1" }) }));
  expect(screen.getByRole("button", { name: /marcar como contato/i })).toBeVisible();
  expect(screen.queryByRole("button", { name: /marcar como ganho/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/app/admin-lead-detail-page.test.tsx --reporter=verbose --maxWorkers=1`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
const user = await getCurrentUser();
if (!user || !hasMinimumRole(user.role, "staff")) redirect("/admin/login");
const lead = await getLeadDetail(id);
if (!lead) notFound();
```

The action re-reads the user, parses `FormData`, calls the service with `actorUserId`, and revalidates `/admin/leads` and the detail path.

- [ ] **Step 4: Run route and regression tests**

Run: `npx vitest run tests/app/admin-lead-detail-page.test.tsx tests/app/admin-leads-page.test.tsx tests/domain/lead-detail.test.ts --reporter=verbose --maxWorkers=1`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/admin/(protected)/leads/[id] components/admin/lead-detail.tsx tests/app/admin-lead-detail-page.test.tsx
git commit -m "feat: add lead detail workspace"
```
