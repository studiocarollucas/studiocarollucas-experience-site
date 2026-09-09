# SCL-551 / SCL-552 Inventory Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Deliver the administrative Acervo catalog with optional private photos, XLSX bulk import, and a searchable item selector for Shoot reservations.

**Architecture:** Create provider-neutral inventory-media metadata and private storage first. Build catalog CRUD and XLSX preview/import over the existing InventoryItem contract, then replace the technical UUID reservation input with a search-backed selector.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle/PostgreSQL, Supabase Storage, Zod, SheetJS xlsx, Vitest, Tailwind.

## Global Constraints

- Read relevant Next.js 16 docs in node_modules/next/dist/docs before App Router or route-handler edits.
- Photos are optional; items without photos remain searchable and reservable.
- Persist provider-neutral private storage paths only; signed URLs are issued server-side.
- Staff/admin only may use catalog, media, template, preview, import, or mutations.
- InventoryReservation remains the sole availability/conflict source.
- Import columns are exactly codigo,nome,tipo,descricao,cor,tamanho,status,preco_interno,ativo.
- Invalid spreadsheet rows are never silently written. Photos are never imported through the spreadsheet.
- Migrations serialize after 0040_inventory_reservations_history_index. No public catalog, checkout, or rental workflow belongs here.

---

### Task 1: Inventory media schema and private bucket

**Files:**
- Modify: db/schema/inventory.ts and db/schema/index.ts
- Create: db/migrations/0041_inventory_media.sql, db/migrations/meta/0041_snapshot.json, tests/db/inventory-media-migration.test.ts
- Modify: db/migrations/meta/_journal.json and tests/domain/inventory-schema.test.ts

**Interfaces:** Produces inventoryMedia with id, inventoryItemId, storagePath, sortOrder, isCover, publishable, createdAt; produces InventoryMedia and NewInventoryMedia.

- [ ] **Step 1: Write failing tests**

Test contract: inventoryMedia exposes all seven fields; migration creates inventory_media, a staff policy, private bucket inventory-media, ordered item index, and a partial unique cover index.

- [ ] **Step 2: Verify RED**

Run: npx.cmd vitest run tests/domain/inventory-schema.test.ts tests/db/inventory-media-migration.test.ts --reporter=verbose --maxWorkers=1
Expected: FAIL because media table and migration do not exist.

- [ ] **Step 3: Implement minimal contract**

Create inventory_media with foreign key inventory_item_id cascading on item deletion, unique storage_path, sortable rows, is_cover false default, publishable false default, created timestamp and item/sort index. Migration 0041 enables RLS, revokes anonymous access, grants authenticated SELECT only, creates staff/admin policy, provisions private inventory-media bucket, and allows only staff/admin storage access. Generate matching snapshot and journal entry.

- [ ] **Step 4: Verify GREEN**

Run: npx.cmd vitest run tests/domain/inventory-schema.test.ts tests/db/inventory-media-migration.test.ts --reporter=verbose --maxWorkers=1; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run predb:migrate
Expected: PASS and journal guard exits 0.

- [ ] **Step 5: Commit**

Commit: feat: add private inventory media schema

### Task 2: Server-only media lifecycle

**Files:**
- Create: domain/inventory/media-schema.ts, domain/inventory/media-storage.ts, domain/inventory/media.ts
- Create: tests/domain/inventory-media.test.ts

**Interfaces:** uploadInventoryMedia({ inventoryItemId, file }), setInventoryMediaCover({ inventoryItemId, mediaId }), removeInventoryMedia({ inventoryItemId, mediaId }), and readInventoryMediaUrls(inventoryItemId).

- [ ] **Step 1: Write failing tests**

Cover: first uploaded image becomes cover. Replacing cover clears the prior cover only for the same item. Removing media removes the storage object then metadata. A failed upload compensates its reserved metadata. Read returns signed URLs but never a raw storage path.

- [ ] **Step 2: Verify RED**

Run: npx.cmd vitest run tests/domain/inventory-media.test.ts --reporter=verbose --maxWorkers=1
Expected: FAIL because the lifecycle module is absent.

- [ ] **Step 3: Implement minimal lifecycle**

Accept image files only. Generate inventory-media/<item-id>/<media-id>.<extension> paths, reserve metadata before upload, compensate safely on storage error, use a transaction for cover change, preserve metadata when physical deletion fails, and sign ordered paths with the existing ten-minute server-only convention.

- [ ] **Step 4: Verify GREEN**

Run: npx.cmd vitest run tests/domain/inventory-media.test.ts --reporter=verbose --maxWorkers=1
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: feat: manage private inventory media

### Task 3: Catalog domain, list query, and audited CRUD

**Files:**
- Create: domain/inventory/catalog-schema.ts, domain/inventory/catalog.ts, domain/inventory/queries.ts
- Create: tests/domain/inventory-catalog.test.ts, tests/domain/inventory-queries.test.ts

**Interfaces:** createInventoryItem(input, actorUserId), updateInventoryItem(id, input, actorUserId), deactivateInventoryItem(id, actorUserId), listInventoryItems(filters), searchReservableInventoryItems(query, shootId).

- [ ] **Step 1: Write failing tests**

Cover creation with unique code, edit, inactive state, audit actions, search by code/name, filters by type/status/color/size, and future-reservation display. Search must exclude inactive, maintenance, and retired items from new reservations.

- [ ] **Step 2: Verify RED**

Run: npx.cmd vitest run tests/domain/inventory-catalog.test.ts tests/domain/inventory-queries.test.ts --reporter=verbose --maxWorkers=1
Expected: FAIL because catalog services are absent.

- [ ] **Step 3: Implement CRUD and query**

Validate using existing inventory enums, reject duplicate codes, write inventory_item.created, inventory_item.updated, and inventory_item.deactivated audits, paginate deterministically, and fetch future reservations without duplicating availability state.

- [ ] **Step 4: Verify GREEN**

Run: npx.cmd vitest run tests/domain/inventory-catalog.test.ts tests/domain/inventory-queries.test.ts --reporter=verbose --maxWorkers=1
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: feat: add inventory catalog domain

### Task 4: XLSX template, preview, and explicit import

**Files:**
- Modify: package.json and package-lock.json
- Create: domain/inventory/import-template.ts, domain/inventory/import.ts, app/api/admin/inventario/template/route.ts
- Create: tests/domain/inventory-import.test.ts, tests/app/admin-inventory-template-route.test.ts

**Interfaces:** createInventoryImportTemplate, previewInventoryImport(file), commitInventoryImport(previewToken, selectedRowNumbers, actorUserId). Preview rows contain rowNumber, normalized input, errors, and optional existingItemId.

- [ ] **Step 1: Write failing tests**

Assert the template header has exactly nine specified columns, includes Acervo and Instruções sheets, preview reports missing name/invalid type/duplicate file code/duplicate database code by row, and commit persists only explicitly selected valid rows.

- [ ] **Step 2: Verify RED**

Run: npx.cmd vitest run tests/domain/inventory-import.test.ts tests/app/admin-inventory-template-route.test.ts --reporter=verbose --maxWorkers=1
Expected: FAIL because XLSX generator, preview, and route do not exist.

- [ ] **Step 3: Implement import**

Install xlsx. Produce Acervo and Instruções sheets with allowed values and an example row. Parse only declared columns, trim input, validate every line using catalog schema, detect duplicate codes in file and database, store a signed short-lived preview token, and transactionally create explicitly selected valid rows with audit events. The download route requires staff and returns the XLSX attachment MIME type.

- [ ] **Step 4: Verify GREEN**

Run: npx.cmd vitest run tests/domain/inventory-import.test.ts tests/app/admin-inventory-template-route.test.ts --reporter=verbose --maxWorkers=1
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: feat: add inventory xlsx import

### Task 5: Admin catalog and searchable reservation picker

**Files:**
- Create: app/admin/(protected)/inventario/page.tsx, app/admin/(protected)/inventario/actions.ts, app/admin/(protected)/inventario/[id]/page.tsx
- Create: components/admin/inventory-catalog.tsx, components/admin/inventory-item-form.tsx, components/admin/inventory-import.tsx
- Modify: components/admin/inventory-reservations.tsx, app/admin/(protected)/agenda/[id]/inventory-actions.ts
- Create: tests/app/admin-inventory-catalog.test.tsx
- Modify: tests/app/admin-inventory-reservations.test.tsx

**Interfaces:** pages at /admin/inventario and /admin/inventario/[id]. The reservation UI submits inventoryItemId from a selected catalog result, never user-entered UUID.

- [ ] **Step 1: Write failing UI tests**

Assert Acervo heading, filters, template download, create/edit/inactivate actions, photo-optional state, future-reservation list, accessible Item do acervo combobox, repeatable reservation additions, and absence of Invalid UUID UI.

- [ ] **Step 2: Verify RED**

Run: npx.cmd vitest run tests/app/admin-inventory-catalog.test.tsx tests/app/admin-inventory-reservations.test.tsx --reporter=verbose --maxWorkers=1
Expected: FAIL because pages and searchable picker do not exist.

- [ ] **Step 3: Implement focused UI/actions**

Render catalog search/filter/list/form/detail/import preview/confirm and private media controls. Replace the UUID input with an accessible code/name combobox that presents type/status and repeatable reserve action. All actions require staff, return field errors safely, use domain audit methods, and revalidate catalog/detail/shoot routes.

- [ ] **Step 4: Verify GREEN**

Run: npx.cmd vitest run tests/app/admin-inventory-catalog.test.tsx tests/app/admin-inventory-reservations.test.tsx tests/domain/inventory-media.test.ts tests/domain/inventory-import.test.ts --reporter=verbose --maxWorkers=1
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: feat: add inventory catalog admin

### Task 6: Close tasks and validate

**Files:**
- Modify: docs/TASKS.md

- [ ] **Step 1: Update tracking**

Mark SCL-551 and SCL-552 DONE only after merge; record their commits. Mark SCL-556 and SCL-557 as unblocked but pending.

- [ ] **Step 2: Run final validation**

Run: npm.cmd run typecheck; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run lint; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npx.cmd vitest run tests/domain/inventory-schema.test.ts tests/db/inventory-media-migration.test.ts tests/domain/inventory-media.test.ts tests/domain/inventory-catalog.test.ts tests/domain/inventory-queries.test.ts tests/domain/inventory-import.test.ts tests/app/admin-inventory-template-route.test.ts tests/app/admin-inventory-catalog.test.tsx tests/app/admin-inventory-reservations.test.tsx --reporter=verbose --maxWorkers=1; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run predb:migrate
Expected: every command exits 0.

- [ ] **Step 3: Commit**

Commit: docs: complete inventory catalog
