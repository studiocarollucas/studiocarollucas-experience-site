# SCL-500/501 — Gallery Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o modelo e armazenamento privado de Galeria para um Shoot, sem antecipar Reveal ou downloads.

**Architecture:** `galleries` representa a Galeria única por ensaio; `gallery_assets` representa arquivos privados ordenados. Serviço server-side cria a Galeria e calcula paths determinísticos, enquanto RLS restringe a fundação à equipe.

**Tech Stack:** Drizzle, PostgreSQL/Supabase Storage, Next.js 16, Vitest.

## Global Constraints

- Esta é a única migration da onda e a única frente que altera `db/schema/index.ts` e `db/migrations/meta/*`.
- Sem URLs públicas, signed URLs, UI Reveal, favoritos, downloads ou upsell.
- Bucket `gallery-assets` é privado; paths não entram em logs/audit públicos.
- Uma Gallery por Shoot é garantida por constraint única.

---

### Task 1: Schema e migration privada

**Files:**
- Create: `db/schema/galleries.ts`
- Create: `db/migrations/0036_gallery_foundation.sql`
- Modify: `db/schema/index.ts`
- Modify: `db/migrations/meta/_journal.json`
- Create: `tests/domain/gallery-schema.test.ts`

**Interfaces:**
- Produces `galleries`, `galleryAssets`, `galleryStatusValues`, `Gallery`, and `GalleryAsset` exports.
- `galleries.shootId` is unique; assets reference `galleryId` and store `storagePath`, `sortOrder`, `createdAt`.

- [ ] **Step 1: Write failing schema tests**

```ts
it("exports one Gallery per Shoot and private asset paths", async () => {
  const { galleries, galleryAssets } = await import("@/db/schema");
  expect(galleries.shootId).toBeDefined();
  expect(galleryAssets.storagePath).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/gallery-schema.test.ts --reporter=verbose --maxWorkers=1`

Expected: FAIL because gallery exports do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export const galleries = pgTable("galleries", {
  id: uuid("id").primaryKey().defaultRandom(), shootId: uuid("shoot_id").notNull(),
  status: galleryStatusEnum("status").notNull().default("draft"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("galleries_shoot_id_unique").on(table.shootId)]);
```

Generate/register migration with two tables, indexes, staff RLS policies and private `gallery-assets` bucket policy. Do not hand-edit an existing journal entry.

- [ ] **Step 4: Run checks**

Run: `npx vitest run tests/domain/gallery-schema.test.ts --reporter=verbose --maxWorkers=1`

Run: `npm run predb:migrate`

Expected: PASS for both.

- [ ] **Step 5: Commit**

```bash
git add db/schema/galleries.ts db/schema/index.ts db/migrations/0036_gallery_foundation.sql db/migrations/meta/_journal.json tests/domain/gallery-schema.test.ts
git commit -m "feat: add private gallery foundation schema"
```

### Task 2: Serviço server-side de Galeria

**Files:**
- Create: `domain/gallery/service.ts`
- Create: `domain/gallery/storage.ts`
- Create: `tests/domain/gallery-service.test.ts`
- Create: `tests/domain/gallery-storage.test.ts`

**Interfaces:**
- Produces `getOrCreateGalleryForShoot(shootId)` and `galleryAssetPath(galleryId, assetId, extension)`.
- `galleryAssetPath` returns `gallery-assets/<galleryId>/<assetId>.<extension>` after allow-list validation.

- [ ] **Step 1: Write failing service/storage tests**

```ts
it("returns the existing Gallery instead of creating a second one", async () => {
  await getOrCreateGalleryForShoot("shoot-1");
  await getOrCreateGalleryForShoot("shoot-1");
  expect(insertGallery).toHaveBeenCalledTimes(1);
});
it("rejects unsafe file extensions", () => {
  expect(() => galleryAssetPath("gallery-1", "asset-1", "../pdf")).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/gallery-service.test.ts tests/domain/gallery-storage.test.ts --reporter=verbose --maxWorkers=1`

Expected: FAIL because services are absent.

- [ ] **Step 3: Write minimal implementation**

Use `onConflictDoNothing` plus select fallback for the unique Shoot relation. Allow only `jpg`, `jpeg`, `png`, and `webp` extensions.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run tests/domain/gallery-service.test.ts tests/domain/gallery-storage.test.ts --reporter=verbose --maxWorkers=1`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add domain/gallery tests/domain/gallery-service.test.ts tests/domain/gallery-storage.test.ts
git commit -m "feat: add gallery storage service"
```
