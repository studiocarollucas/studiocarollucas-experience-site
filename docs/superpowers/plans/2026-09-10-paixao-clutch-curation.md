# Paixão Clutch Curation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a curadoria administrativa única Paixão Clutch, com preços de aluguel/reposição, imagem pública consciente e reservas de aluguel com devolução prevista.

**Architecture:** Estender `inventory_items` com dados comerciais e editoriais exclusivamente administrativos e manter a imagem pública como metadado separado da mídia privada. O domínio continua sendo a fronteira de autorização, auditoria e transação; `inventory_reservations` permanece fonte única de disponibilidade, usando `endsOn` como data prevista de devolução para `rental`.

**Tech Stack:** Next.js App Router, React, TypeScript, Drizzle/PostgreSQL, Zod, Vitest.

## Global Constraints

- Apenas `staff` e `admin` leem ou alteram curadoria, preços e mídia pública.
- Apenas `clutch` pode participar da curadoria.
- Preço de aluguel e reposição são decimais não negativos; reposição e preço interno nunca entram em projeções públicas.
- Publicação exige item ativo/available, preço de aluguel, copy curta e imagem pública.
- Fotos administrativas permanecem privadas; nenhuma mídia existente é publicada automaticamente.
- Reservas são a única fonte de conflito/disponibilidade; `rental` exige início e devolução prevista, e o intervalo completo bloqueia.
- Toda mutação sensível é auditada na mesma transação do estado.

---

### Task 1: Modelo editorial e comercial

**Files:**
- Modify: `db/schema/inventory.ts`
- Create: `db/migrations/0043_paixao_clutch_curation.sql`
- Modify: `db/migrations/meta/_journal.json`
- Create: `db/migrations/meta/0043_snapshot.json`
- Create: `domain/inventory/clutch-schema.ts`
- Create: `domain/inventory/clutch.ts`
- Test: `tests/domain/inventory-clutch.test.ts`
- Test: `tests/db/inventory-clutch-migration.test.ts`

**Interfaces:** Produces `updatePaixaoClutch(input, actorUserId)` and `listPaixaoClutchForAdmin(filters, actorUserId)`; later UI consumes their typed projections.

- [ ] **Step 1: Write failing domain and migration tests**

```ts
expect(updatePaixaoClutchSchema.safeParse({ itemId, rentalPrice: "120.00", replacementValue: "600.00", copy: "...", publicImagePath: "...", published: true })).toBeTruthy();
expect(updatePaixaoClutchSchema.safeParse({ itemId, rentalPrice: "-1" })).toBeFalsy();
expect(migration).toContain('rental_price');
expect(migration).toContain('replacement_value');
```

- [ ] **Step 2: Run focused tests; expect failure**

Run: `npx vitest run tests/domain/inventory-clutch.test.ts tests/db/inventory-clutch-migration.test.ts`

- [ ] **Step 3: Implement schema, migration and transactional domain mutation**

```ts
export const updatePaixaoClutchSchema = z.object({
  itemId: z.string().uuid(), rentalPrice: money.optional(), replacementValue: money.optional(),
  copy: z.string().trim().max(280).optional(), publicImagePath: z.string().trim().max(500).optional(),
  published: z.boolean(), featured: z.boolean(), sortOrder: z.number().int().min(0),
});
```

Lock the item, reject non-clutch/inactive/unavailable publication, require all publication prerequisites, record before/after audit in the transaction, and add generated migration/snapshot/journal.

- [ ] **Step 4: Run focused tests; expect pass**

Run: `npx vitest run tests/domain/inventory-clutch.test.ts tests/db/inventory-clutch-migration.test.ts`

- [ ] **Step 5: Commit**

Run: `git add db/schema/inventory.ts db/migrations domain/inventory/clutch* tests/domain/inventory-clutch.test.ts tests/db/inventory-clutch-migration.test.ts; git commit -m "feat: add Paixão Clutch curation model"`

### Task 2: Reserva de aluguel com devolução prevista

**Files:**
- Modify: `domain/inventory/reservation-schema.ts`
- Modify: `domain/inventory/reservations.ts`
- Modify: `app/admin/(protected)/agenda/[id]/inventory-actions.ts`
- Modify: `components/admin/inventory-reservations.tsx`
- Test: `tests/domain/inventory-reservations.test.ts`
- Test: `tests/app/admin-inventory-reservations.test.tsx`

**Interfaces:** Extends reservation input with `purpose: "shoot" | "rental"`; for rental, `endsOn` is labelled `Data prevista de devolução`.

- [ ] **Step 1: Write failing tests**

```ts
expect(createInventoryReservationSchema.safeParse({ ...base, purpose: "rental", startsOn: "2026-10-10", endsOn: "2026-10-09" }).success).toBe(false);
expect(screen.getByLabelText(/data prevista de devolução/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run focused tests; expect failure**

Run: `npx vitest run tests/domain/inventory-reservations.test.ts tests/app/admin-inventory-reservations.test.tsx`

- [ ] **Step 3: Implement purpose-aware validation and UI**

Require explicit `purpose` in the action, preserve the database interval check, create the reservation with the selected purpose, and show the manual return-date label/help only for `rental`. Preserve advisory/row locks, eligibility checks, conflict override and audit.

- [ ] **Step 4: Run focused tests; expect pass**

Run: `npx vitest run tests/domain/inventory-reservations.test.ts tests/app/admin-inventory-reservations.test.tsx`

- [ ] **Step 5: Commit**

Run: `git add domain/inventory/reservation-schema.ts domain/inventory/reservations.ts "app/admin/(protected)/agenda/[id]/inventory-actions.ts" components/admin/inventory-reservations.tsx tests/domain/inventory-reservations.test.ts tests/app/admin-inventory-reservations.test.tsx; git commit -m "feat: record planned rental returns"`

### Task 3: Tela administrativa de curadoria

**Files:**
- Create: `app/admin/(protected)/paixao-clutch/page.tsx`
- Create: `app/admin/(protected)/paixao-clutch/actions.ts`
- Create: `components/admin/paixao-clutch-catalog.tsx`
- Modify: `components/admin/admin-nav.tsx`
- Test: `tests/app/admin-paixao-clutch.test.tsx`

**Interfaces:** Consumes Task 1 domain functions; produces no public projection.

- [ ] **Step 1: Write failing UI/action tests**

```tsx
expect(screen.getByRole("heading", { name: /paixão clutch/i })).toBeInTheDocument();
expect(screen.queryByText(/valor de reposição.*públic/i)).not.toBeInTheDocument();
expect(actionForClient).toReject(/não autorizado/i);
```

- [ ] **Step 2: Run focused tests; expect failure**

Run: `npx vitest run tests/app/admin-paixao-clutch.test.tsx`

- [ ] **Step 3: Implement server page, actions and focused client controls**

Render only clutches with filter/status and operational availability. Use Server Actions to invoke domain methods with authenticated actor. Provide controlled fields for prices, copy, explicit public-image reference, publish, featured and order; surface validation errors without leaking private media paths.

- [ ] **Step 4: Run focused tests; expect pass**

Run: `npx vitest run tests/app/admin-paixao-clutch.test.tsx`

- [ ] **Step 5: Commit**

Run: `git add "app/admin/(protected)/paixao-clutch" components/admin/paixao-clutch-catalog.tsx components/admin/admin-nav.tsx tests/app/admin-paixao-clutch.test.tsx; git commit -m "feat: add Paixão Clutch admin curation"`

### Task 4: Documentação e validação integrada

**Files:**
- Modify: `docs/TASKS.md`
- Test: `tests/domain/inventory-clutch.test.ts`
- Test: `tests/domain/inventory-reservations.test.ts`
- Test: `tests/app/admin-paixao-clutch.test.tsx`

- [ ] **Step 1: Update SCL-556 status and hand-off notes**

Mark it `MERGE_READY` only after all checks pass; keep SCL-557 and SCL-558 pending.

- [ ] **Step 2: Run integrated validation**

Run: `npx vitest run tests/domain/inventory-clutch.test.ts tests/domain/inventory-reservations.test.ts tests/app/admin-paixao-clutch.test.tsx; npx tsc --noEmit --pretty false; npm run lint; npm run build; git diff --check`

Expected: all commands exit 0.

- [ ] **Step 3: Commit**

Run: `git add docs/TASKS.md; git commit -m "docs: complete Paixão Clutch curation"`

## Self-review

- Task 1 implements prices, editorial fields, authorization, audit, private/public separation and migration.
- Task 2 implements the manual rental return-date rule without a competing availability model.
- Task 3 implements the single admin collection and preserves private data boundaries.
- Task 4 keeps delivery state honest and verifies the integration.
- No placeholders, divergent interfaces or public checkout scope are included.
