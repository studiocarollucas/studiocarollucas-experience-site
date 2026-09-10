# Paixão Clutch Public Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir upload ou cópia consciente de foto interna como imagem pública de uma clutch.

**Architecture:** Criar metadado e bucket público separados; ações de servidor copiam bytes privados ou enviam arquivo novo e atualizam a curadoria transacionalmente. O caminho público é gerado pelo domínio, nunca digitado pelo usuário.

**Tech Stack:** Next.js, React, TypeScript, Drizzle, Supabase Storage, Zod, Vitest.

## Global Constraints

- Apenas staff/admin; mídia interna nunca muda de bucket/permissão.
- JPEG/PNG/WebP até 4 MB; somente mídia pertencente ao mesmo item pode ser copiada.
- Remover mídia pública despublica a clutch e toda alteração é auditada.
- Não implementar recorte, checkout ou vitrine pública.

---

### Task 1: Domínio, storage e migration

**Files:** Modify `db/schema/inventory.ts`, `domain/inventory/clutch.ts`, `domain/inventory/clutch-schema.ts`; Create migration `0045`, storage adapter; Test `tests/domain/inventory-public-media.test.ts`.

- [ ] **Step 1: Write failing tests**

```ts
expect(await promoteInventoryMedia({ itemId, mediaId }, staffId)).toMatchObject({ publicPath: expect.stringContaining("paixao-clutch") });
await expect(promoteInventoryMedia({ itemId, mediaId: otherItemMedia }, staffId)).rejects.toThrow(/mídia.*item/i);
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/domain/inventory-public-media.test.ts`

- [ ] **Step 3: Implement**

Create a public bucket and public-media metadata/reference, copy source bytes server-side, upload new File with generated path, lock item, update editorial reference, audit, and compensate failed storage/database operations. Removal deletes public object and sets `published:false` atomically.

- [ ] **Step 4: Run GREEN and commit**

Run: `npx vitest run tests/domain/inventory-public-media.test.ts && git add db domain tests && git commit -m "feat: manage public clutch media"`

### Task 2: Admin controls

**Files:** Modify `app/admin/(protected)/paixao-clutch/actions.ts`, `components/admin/paixao-clutch-catalog.tsx`; Test `tests/app/admin-paixao-clutch.test.tsx`.

- [ ] **Step 1: Write failing UI/action tests**

```tsx
expect(screen.getByRole("button", { name: /usar foto interna/i })).toBeInTheDocument();
expect(screen.getByLabelText(/enviar imagem pública/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/app/admin-paixao-clutch.test.tsx`

- [ ] **Step 3: Implement**

Show signed internal thumbnails only to staff, chooser for same-item media, upload control, public preview, replacement/removal actions and errors. Remove manual path input.

- [ ] **Step 4: Run GREEN and commit**

Run: `npx vitest run tests/app/admin-paixao-clutch.test.tsx && git add app components tests && git commit -m "feat: add public media controls to Paixão Clutch"`

### Task 3: Validation and tracking

**Files:** Modify `docs/TASKS.md`; Test public-media/domain/UI tests.

- [ ] **Step 1: Run validation**

Run: `npx vitest run tests/domain/inventory-public-media.test.ts tests/app/admin-paixao-clutch.test.tsx; npx tsc --noEmit --pretty false; npm run lint; npm run build; git diff --check`

- [ ] **Step 2: Update tracking and commit**

Record the new public-media prerequisite for SCL-557 without marking the public vitrine done. Run: `git add docs/TASKS.md && git commit -m "docs: track Paixão Clutch public media"`

## Self-review

Tasks cover separate storage, explicit private-to-public copy, upload, replacement/removal, authorization, audit, removal despublication and no crop/checkout/public-page scope.
