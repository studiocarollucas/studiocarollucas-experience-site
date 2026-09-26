# SCL-554 Seleção de figurinos/clutches pela cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cliente marca figurinos/clutches reais do acervo como preferência do seu ensaio na página de Styling; a equipe confirma ou ajusta no Admin do ensaio, com as regras de conflito e auditoria existentes.

**Architecture:** Sem migration. Preferência = `inventory_reservations` `pending` + `shoot_id`; confirmação = `confirmed`. Regras puras em `domain/inventory/portal-selection-rules.ts`; leitura/escrita do portal em `domain/inventory/portal-selection.ts` (Drizzle + service role só para assinar fotos); confirmação da equipe em `domain/inventory/reservations.ts`. Portal: Server Action em `app/(client)`; Admin: `defineAdminAction`.

**Tech Stack:** Next.js 16 App Router (Server Actions), Drizzle ORM, Supabase Storage, Vitest + Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-26-scl554-scl555-portal-inventory-design.md`

## Global Constraints

- Nenhuma migration (0051 pertence a outra branch); SCL-555 fica como follow-up desenhado no spec.
- Cliente/ensaio sempre de `getPortalRequestContext()`; o domínio revalida posse no banco.
- Nada conecta em import; o client de service role é criado dentro da função.
- Nenhuma dependência nova; nenhum `storage_path`, preço, código ou descrição interna no browser.

---

### Task 1: Spec + plano

- [x] Spec e plano nesta pasta.

### Task 2: Regras puras

**Files:** Create `domain/inventory/portal-selection-rules.ts`, `tests/domain/inventory-portal-selection-rules.test.ts`

**Interfaces:**
- `inventoryPreferenceInputSchema` (`{ inventoryItemId: uuid, preferred: boolean }`)
- `isPortalSelectionOpen(shoot, today)`, `portalPreferenceLimits(experience)`, `eligiblePortalInventoryTypes(limits)`
- `portalItemAvailability({ ownStatus, blockedElsewhere })`

- [x] Testes primeiro; implementação mínima.

### Task 3: Leitura e escrita do portal

**Files:** Create `domain/inventory/portal-selection.ts`, `tests/domain/inventory-portal-selection.test.ts`

**Interfaces:**
- `readPortalInventorySelection(context: PortalContext, now?: Date): Promise<PortalInventorySelection | null>`
- `setClientInventoryPreference(actor: { clientId; shootId; authUserId }, input: unknown): Promise<{ inventoryItemId; state }>`
- `PortalInventorySelectionError` (`invalid_input | not_open | not_eligible | unavailable | limit_reached | confirmed`)

- [x] Testes com `db` mockado: lock antes de ler, posse do ensaio, idempotência, limite, conflito, auditoria, retirada só de `pending`.
- [x] Implementação.

### Task 4: Confirmação pela equipe

**Files:** Modify `domain/inventory/reservations.ts`, `domain/inventory/reservation-schema.ts`, `app/admin/(protected)/agenda/[id]/inventory-actions.ts`, `components/admin/inventory-reservations.tsx`, tests correspondentes.

- [x] `confirmShootInventoryReservation` (conflito excluindo a própria reserva, exceção explícita, auditoria `inventory_reservation.confirmed`).
- [x] `confirmShootInventoryReservationAction` com `defineAdminAction`.
- [x] UI: "Preferência da cliente" + "Confirmar reserva".

### Task 5: Portal

**Files:** Create `app/(client)/minha-experiencia/styling/actions.ts`, `components/client/inventory-selection.tsx`; Modify `app/(client)/minha-experiencia/styling/page.tsx` (usa o snapshot já resolvido como `PortalContext`); tests.

- [x] Action resolve o contexto pela sessão; mensagens neutras.
- [x] Componente: "Peças do seu ensaio" (preferência × reservada), catálogo por tipo com "Indisponível na data do seu ensaio", contador de limite, foco/44 px/aria-live.
- [x] Página: seção de acervo antes do moodboard, falha isolada.

### Task 6: TASKS.md

- [x] SCL-554 → `IN_REVIEW`, owner `agent:claude-code`, branch preenchida, critérios marcados.
