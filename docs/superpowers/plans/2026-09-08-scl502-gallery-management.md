# Gallery management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff upload, order, remove and immediately publish a Shoot's private Gallery.

**Architecture:** The server verifies staff authorization and Shoot/Gallery ownership before writing metadata or storage. The existing private bucket remains the only object store; the portal obtains short-lived URLs only after client ownership and `published` status are verified.

**Tech Stack:** Next.js, Supabase Storage, Drizzle, Zod, Vitest.

## Global Constraints

- Only staff/admin upload, reorder, remove or publish.
- `published` makes the Gallery immediately visible only to the owning portal Client.
- No public URL, client upload, download, favorites, reveal, upsell or migration belongs here.
- Images are limited to JPEG, PNG and WebP; paths use the existing `galleryAssetPath` allow-list.

---

### Task 1: Gallery asset lifecycle service

**Files:**
- Create: `domain/gallery/assets.ts`, `domain/gallery/schema.ts`, `tests/domain/gallery-assets.test.ts`

**Interfaces:**
- Produces `uploadGalleryAsset(input)`, `reorderGalleryAssets(input)`, `removeGalleryAsset(input)`, `publishGallery(galleryId)`.

- [ ] **Step 1: Write failing tests**

```ts
it("rejects a non-image before reserving metadata", async () => {
  await expect(uploadGalleryAsset({ galleryId, file: new File(["x"], "x.pdf", { type: "application/pdf" }) })).rejects.toThrow();
});
it("marks a draft gallery published and returns the ordered asset ids", async () => {
  await expect(publishGallery(galleryId)).resolves.toMatchObject({ status: "published" });
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/domain/gallery-assets.test.ts --reporter=verbose --maxWorkers=1`  
Expected: FAIL because lifecycle functions do not exist.

- [ ] **Step 3: Implement minimal lifecycle**

```ts
const fileSchema = z.object({ type: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().positive().max(20 * 1024 * 1024) });
export async function publishGallery(galleryId: string) {
  const [gallery] = await db.update(galleries).set({ status: "published" }).where(eq(galleries.id, galleryId)).returning();
  if (!gallery) throw new Error("Galeria não encontrada.");
  return gallery;
}
```

Reserve metadata, upload to `gallery-assets`, clean up on failed metadata/storage operations, and use explicit ordered IDs for reorder.

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run tests/domain/gallery-assets.test.ts tests/domain/gallery-service.test.ts tests/domain/gallery-storage.test.ts --reporter=verbose --maxWorkers=1`  
Expected: all Gallery domain tests pass.

- [ ] **Step 5: Commit**

```bash
git add domain/gallery tests/domain/gallery-assets.test.ts
git commit -m "feat: manage private gallery assets"
```

### Task 2: Admin Gallery workspace

**Files:**
- Create: `app/admin/(protected)/galerias/[shootId]/page.tsx`, `app/admin/(protected)/galerias/[shootId]/actions.ts`, `components/admin/gallery-manager.tsx`, `tests/app/admin-gallery-page.test.tsx`

- [ ] **Step 1: Write failing tests**

```ts
it("blocks client roles before loading a gallery", async () => {
  mocks.getCurrentUser.mockResolvedValue({ id: "client-user", role: "client" });
  await expect(GalleryPage({ params: Promise.resolve({ shootId }) })).rejects.toThrow("Acesso negado");
  expect(mocks.getGalleryForShoot).not.toHaveBeenCalled();
});
it("publishes through a staff action and revalidates the gallery route", async () => {
  await publishGalleryAction({ galleryId, shootId });
  expect(mocks.publishGallery).toHaveBeenCalledWith(galleryId);
  expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/galerias/${shootId}`);
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/app/admin-gallery-page.test.tsx --reporter=verbose --maxWorkers=1`  
Expected: FAIL because page/actions do not exist.

- [ ] **Step 3: Implement protected UI**

```ts
export const publishGalleryAction = defineAdminAction({ role: "staff", input: z.object({ galleryId: z.string().uuid(), shootId: z.string().uuid() }) }, async ({ galleryId, shootId }) => {
  await publishGallery(galleryId);
  revalidatePath(`/admin/galerias/${shootId}`);
});
```

Render upload, ordered asset list, removal and one publish control; label the published action as immediate portal availability.

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run tests/app/admin-gallery-page.test.tsx --reporter=verbose --maxWorkers=1; npm run check:admin-auth`  
Expected: tests and authorization guard pass.

- [ ] **Step 5: Commit**

```bash
git add app/admin components/admin tests/app/admin-gallery-page.test.tsx
git commit -m "feat: add gallery publishing workspace"
```

### Task 3: Portal read model for published private galleries

**Files:**
- Create: `domain/gallery/portal.ts`, `app/(client)/minha-experiencia/galeria/page.tsx`, `tests/domain/gallery-portal.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
it("returns no assets for a draft gallery", async () => expect(await readClientGallery(context)).toEqual(null));
it("creates signed URLs only for the portal owner's published gallery", async () => expect(await readClientGallery(context)).toMatchObject({ assets: expect.any(Array) }));
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/domain/gallery-portal.test.ts --reporter=verbose --maxWorkers=1`  
Expected: FAIL because the portal read model does not exist.

- [ ] **Step 3: Implement ownership-gated signed reads**

```ts
const gallery = await findPublishedGalleryForClient(context.clientId);
if (!gallery) return null;
return { ...gallery, assets: await signGalleryAssetUrls(gallery.assets, 60 * 10) };
```

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run tests/domain/gallery-portal.test.ts tests/domain/portal-rls.integration.test.ts --reporter=verbose --maxWorkers=1`  
Expected: focused tests pass; integration test is skipped only when live credentials are absent.

- [ ] **Step 5: Commit**

```bash
git add app/(client) domain/gallery tests/domain/gallery-portal.test.ts
git commit -m "feat: show published galleries in portal"
```
