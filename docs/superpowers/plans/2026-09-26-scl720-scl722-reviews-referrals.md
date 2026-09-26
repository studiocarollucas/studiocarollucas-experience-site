# SCL-720/SCL-722 Review + Referral e tracking de indicação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar Review e Referral com integridade no banco e serviços auditados, e usar Referral no comercial: o Lead registra a indicadora, a conversão preserva a relação e o Admin mede indicações informadas/convertidas.

**Architecture:** Migration 0051 cria `review_status`, `reviews`, `referrals`, triggers (`reviews_shoot_matches_client`, `referrals_guard_graph`, `clients_referrer_client_id_frozen`), backfill do campo legado e RLS staff-only. `domain/reviews` e `domain/referrals` concentram validação (Zod), regras e auditoria; `convertWonLead` chama `linkLeadReferralOnConversion(tx, …)` na mesma transação. Admin usa `defineAdminAction`.

**Tech Stack:** Next.js 16 App Router (Server Actions), Drizzle ORM, Zod 4, Vitest + Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-26-scl720-scl722-reviews-referrals-design.md`

## Global Constraints

- Única migration da leva: `0051`, `prevId` = id do snapshot 0050; `when` real e monotônico; migrations anteriores intocadas.
- drizzle-kit não roda neste ambiente: SQL, snapshot e journal escritos à mão no formato exato do gerador.
- Nenhuma dependência nova. Nada conecta ao banco em import.
- `actorUserId` sempre vem de `ctx.user.id`; nenhuma action aceita ator do browser.

---

### Task 1: Migration 0051 + schema Drizzle

**Files:**
- Create: `db/schema/growth.ts`; Modify: `db/schema/index.ts`, `db/schema/clients.ts` (comentário do legado)
- Create: `db/migrations/0051_reviews_referrals.sql`, `db/migrations/meta/0051_snapshot.json`; Modify: `db/migrations/meta/_journal.json`
- Create: `tests/db/reviews-referrals-migration.test.ts`
- Modify: `tests/db/gallery-selections-migration.test.ts` (localiza 0050 pelo tag, pois deixa de ser a última)

- [ ] Teste da migration: enum, tabelas, checks, índices, FKs, triggers, backfill, congelamento, RLS/grants, snapshot encadeado e journal idx 51.
- [ ] SQL no formato do drizzle-kit (type → tables → FKs → indexes) + bloco hand-written.
- [ ] Snapshot derivado do 0050 (tabelas `public.reviews`, `public.referrals` e enum `public.review_status` ao fim).

### Task 2: Domínio de Review

**Files:** Create `domain/reviews/{schema,service}.ts`, `tests/domain/reviews-service.test.ts`

**Interfaces:**
- `requestReview(input, actorUserId): Promise<{ review: Review; created: boolean }>`
- `completeReview(input, actorUserId): Promise<{ review: Review; changed: boolean }>`
- `cancelReview(input, actorUserId): Promise<{ review: Review; changed: boolean }>`
- `listClientReviews(clientId): Promise<Review[]>`

- [ ] Testes: input inválido não abre transação; Shoot de outra cliente rejeitado; conflito devolve existente sem auditoria; conclusão/cancelamento só a partir de `solicitado`, com auditoria na transação.
- [ ] Implementação.

### Task 3: Domínio de Referral + conversão

**Files:** Create `domain/referrals/{schema,errors,service,lead-conversion,queries}.ts`; Modify `domain/leads/conversion.ts`; Create `tests/domain/referrals-{service,lead-conversion,errors,queries}.test.ts`; Modify `tests/domain/lead-conversion.test.ts`

**Interfaces:**
- `setLeadReferral(input): Promise<{ referral: Referral; changed: boolean }>`
- `removeLeadReferral(input): Promise<{ removed: boolean }>`
- `recordClientReferral(input): Promise<Referral>`
- `linkLeadReferralOnConversion(tx, { leadId, clientId, convertedAt, actorUserId }): Promise<Referral | null>`
- `referralErrorFromDatabase(error): ReferralError | null`
- `getLeadReferralPanel(leadId)`, `getClientReferralSummary(clientId)`, `getReferralMetrics(range)`

- [ ] Testes: auto-indicação, indicadora inexistente, troca só antes da conversão, Lead já convertido nasce convertido, remoção só não convertida, mapeamento de `referrals_no_cycle`/unicidade (inclusive via `cause`), vínculo na conversão (no-op, conflito, sucesso auditado), `convertWonLead` chama o vínculo com o `tx`.
- [ ] Implementação.

### Task 4: Admin

**Files:**
- Modify: `app/admin/(protected)/leads/[id]/{actions.ts,page.tsx}`, `components/admin/lead-detail.tsx`
- Create: `components/admin/lead-referral.tsx`
- Modify: `domain/dashboard/queries.ts`, `app/admin/(protected)/page.tsx`, `app/admin/(protected)/clientes/[id]/page.tsx`
- Modify: `domain/clients/schema.ts`, `tests/domain/clients-form-schema.test.ts`
- Create: `tests/app/admin-lead-referral.test.tsx`; Modify: `tests/app/admin-lead-detail-page.test.tsx`, `tests/app/admin-lead-conversion.test.tsx`

- [ ] Testes: actions exigem staff e usam o ator da sessão; `ReferralError` vira mensagem acionável (também na conversão); a ficha mostra a indicadora e o formulário.
- [ ] Implementação + `npm run check:admin-auth`.

### Task 5: Documentação

- [ ] `docs/TASKS.md`: SCL-720/SCL-722 → `IN_REVIEW`, owner, branch, critérios.
- [ ] `docs/DECISIONS.md`: papel de `clients.referrer_client_id` e integridade de Referral.
