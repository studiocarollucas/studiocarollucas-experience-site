# SCL-504/SCL-505 Favoritos e downloads autorizados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cliente dona de uma Gallery publicada favorita fotos e, quando liberado pela equipe, baixa cada foto por URL assinada curta; o Admin vê as contagens e controla o bloqueio de download com auditoria.

**Architecture:** Migration 0050 cria `photo_selections` e `galleries.downloads_enabled`. `domain/gallery/selections.ts` concentra a autorização por foto (asset → gallery publicada → shoot da cliente) e a persistência idempotente; `domain/gallery/downloads.ts` assina o download e alterna o bloqueio auditado. O portal usa uma Server Action em `app/(client)` e um Route Handler que redireciona para o storage; o Admin usa `defineAdminAction`.

**Tech Stack:** Next.js 16 App Router (Server Actions, Route Handlers), Drizzle ORM, Supabase Storage (service role no servidor), Vitest + Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-25-scl504-scl505-gallery-selection-downloads-design.md`

## Global Constraints

- Branch empilhada sobre `claude/scl-700-705-email-foundation` (dona da 0049): esta entrega é `0050`, `prevId` = id do snapshot 0049.
- Nunca confiar em id de cliente vindo do browser; `context.client.id` vem de `getPortalRequestContext()`.
- Nada conecta em import (build de CI roda com env placeholder); o client Supabase de service role é criado dentro da função.
- Nenhuma dependência nova.

---

### Task 1: Migration 0050 + schema Drizzle

**Files:**
- Modify: `db/schema/galleries.ts`
- Create: `db/migrations/0050_gallery_selections_downloads.sql`, `db/migrations/meta/0050_snapshot.json`
- Modify: `db/migrations/meta/_journal.json`
- Create: `tests/db/gallery-selections-migration.test.ts`
- Modify: `tests/db/email-automation-migration.test.ts` (localiza a entrada 0049 pelo tag, pois deixa de ser a última)
- Modify: `tests/domain/gallery-schema.test.ts`

- [ ] Escrever o teste da migration (SQL, RLS/grants, snapshot encadeado, journal idx 50) e do schema (`photoSelections`, `downloadsEnabled` default `false`).
- [ ] `photoSelections` com FKs `cascade`, unique `photo_selections_client_gallery_asset_unique`, índice `photo_selections_gallery_asset_idx`.
- [ ] SQL no formato do drizzle-kit (create table → add column → FKs → index) + bloco de RLS/grant/policy.
- [ ] Snapshot derivado do 0049 (nova tabela logo após `public.gallery_assets`, coluna ao fim de `public.galleries`), journal com `when` real.

### Task 2: Domínio de favoritos

**Files:**
- Modify: `domain/gallery/schema.ts`
- Create: `domain/gallery/selections.ts`
- Create: `tests/domain/gallery-selections.test.ts`, `tests/domain/gallery-selections.integration.test.ts`

**Interfaces:**
- `findAuthorizedClientAsset(clientId, assetId): Promise<{ assetId; galleryId; storagePath; downloadsEnabled } | null>`
- `setPhotoSelection(clientId, input: unknown): Promise<{ assetId: string; selected: boolean }>` — lança `GallerySelectionError` para foto não autorizada.
- `listClientSelectedAssetIds(clientId, galleryId): Promise<string[]>`
- `getGallerySelectionSummary(galleryId): Promise<{ totalSelections: number; byAssetId: Record<string, number> }>`

- [ ] Testes: escopo SQL (`gallery_assets.id`, `shoots.client_id`, `galleries.status = 'published'`), `ON CONFLICT DO NOTHING`, delete por chave, input inválido, foto de outra cliente não grava nada, agregação da contagem.
- [ ] Implementação mínima.

### Task 3: Domínio de downloads

**Files:**
- Modify: `domain/gallery/storage.ts`
- Create: `domain/gallery/downloads.ts`, `tests/domain/gallery-downloads.test.ts`
- Modify: `tests/domain/gallery-storage.test.ts`

**Interfaces:**
- `createClientAssetDownload(clientId, assetId): Promise<{ status: "ok"; signedUrl } | { status: "not_found" } | { status: "blocked" }>`
- `setGalleryDownloadsEnabled({ galleryId, enabled, actorUserId }): Promise<{ galleryId; downloadsEnabled; changed }>`

- [ ] Testes: 60 s + nome de arquivo sem caminho, bloqueado não assina, foto não autorizada não assina, falha do storage lança; toggle audita na transação só quando muda e falha para galeria inexistente.
- [ ] Implementação.

### Task 4: Portal da cliente

**Files:**
- Create: `app/(client)/minha-experiencia/galeria/actions.ts`
- Create: `app/(client)/minha-experiencia/galeria/fotos/[assetId]/download/route.ts`
- Create: `components/client/gallery-grid.tsx`
- Modify: `app/(client)/minha-experiencia/galeria/page.tsx`
- Create: `tests/app/client-gallery-actions.test.ts`, `tests/app/client-gallery-download-route.test.ts`, `tests/app/client-gallery-page.test.tsx`, `tests/components/client-gallery-grid.test.tsx`

- [ ] Action: resolve a cliente pela sessão, mensagens neutras, nunca recebe `clientId`.
- [ ] Route Handler: 401/403/404/403-bloqueado/307 `no-store`.
- [ ] Componente: botão `aria-pressed` por foto, contador `aria-live`, reverte em erro, link de download só quando liberado.
- [ ] Página: passa apenas `id` + URL assinada ao componente.

### Task 5: Admin

**Files:**
- Modify: `app/admin/(protected)/galerias/[shootId]/actions.ts`, `app/admin/(protected)/galerias/[shootId]/page.tsx`, `components/admin/gallery-manager.tsx`
- Modify: `tests/app/admin-gallery-page.test.tsx`

- [ ] `setGalleryDownloadsAction` (`defineAdminAction`, staff) com `actorUserId` do contexto e `revalidatePath`.
- [ ] Página carrega `getGallerySelectionSummary`; manager mostra totais por galeria/foto e o controle de downloads.

### Task 6: Documentação e status

- [ ] `docs/TASKS.md`: SCL-504/505 → `IN_REVIEW`, owner, branch, critérios.
- [ ] `docs/DECISIONS.md`: download bloqueado por padrão e favoritos por estado desejado.

## Verificação

`npm run lint`, `npm run check:admin-auth`, `npm run typecheck`, `npm run test`, `npm run build` na CI (o ambiente local não instala dependências). Teste live opcional: `RUN_LIVE_DB_TESTS=true npm run test -- tests/domain/gallery-selections.integration.test.ts` com a 0050 aplicada.
