# SCL-503 Gallery Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the owner of a published gallery an accessible, mobile-first editorial opening screen before the existing private gallery.

**Architecture:** Reuse `readClientGallery` as the published-status and ownership gate. Derive cover/title/message from that server-only read model, render `/minha-experiencia/reveal`, and send the CTA to the existing gallery route. No Reveal persistence or storage URL is added.

**Tech Stack:** Next.js 16 App Router, React Server Components, TypeScript, Supabase signed URLs, Vitest, Tailwind.

## Global Constraints

- Read relevant Next.js 16 docs in `node_modules/next/dist/docs/` before App Router edits.
- Publication remains immediate and the existing Gallery route remains directly available.
- Only the authenticated owner of a published Gallery can read Reveal data.
- The screen uses signed URLs from the existing server service, never raw storage paths.
- The page is keyboard-operable, semantic, mobile-first, and respects reduced motion.
- Favorites, download, upsell, and delivery communication remain out of scope.

---

### Task 1: Reveal read-model contract

**Files:**
- Modify: `domain/gallery/portal.ts`
- Modify: `tests/domain/gallery-portal.test.ts`

**Interfaces:**
- Produces `readClientGalleryReveal(context): Promise<{ id: string; title: string; message: string; cover: { alt: string; signedUrl: string } } | null>`.

- [ ] **Step 1: Write failing tests**

```ts
await expect(readClientGalleryReveal(context)).resolves.toEqual({
  id: "gallery-1", title: "Suas fotos estão prontas", message: expect.any(String),
  cover: { alt: "Capa da sua galeria", signedUrl: expect.stringContaining("signed=1") },
});
await expect(readClientGalleryReveal(draftOwnerContext)).resolves.toBeNull();
expect(mocks.createSignedUrls).toHaveBeenCalledWith([assets[0].storagePath], 60 * 10);
```

- [ ] **Step 2: Verify failure**

Run: `npx.cmd vitest run tests/domain/gallery-portal.test.ts --reporter=verbose --maxWorkers=1`  
Expected: FAIL because the Reveal read model is not exported.

- [ ] **Step 3: Implement the minimal server-only read**

```ts
export async function readClientGalleryReveal(context: PortalContext) {
  const gallery = await readClientGallery(context);
  if (!gallery || gallery.assets.length === 0) return null;
  return {
    id: gallery.id,
    title: "Suas fotos estão prontas",
    message: "Um capítulo especial da sua experiência foi preparado para você.",
    cover: { alt: "Capa da sua galeria", signedUrl: gallery.assets[0].signedUrl },
  };
}
```

Keep it in `domain/gallery/portal.ts`, thus reusing the owner-only published query and ten-minute signed cover URL.

- [ ] **Step 4: Verify test**

Run: `npx.cmd vitest run tests/domain/gallery-portal.test.ts --reporter=verbose --maxWorkers=1`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add domain/gallery/portal.ts tests/domain/gallery-portal.test.ts
git commit -m "feat: add private gallery reveal read model"
```

### Task 2: Reveal route and presentation

**Files:**
- Create: `app/(client)/minha-experiencia/reveal/page.tsx`
- Create: `components/client/gallery-reveal.tsx`
- Create: `tests/app/client-gallery-reveal-page.test.tsx`

**Interfaces:**
- Consumes `readClientGalleryReveal(await getPortalRequestContext())`.
- Produces heading, cover image, editorial message, and `<Link href="/minha-experiencia/galeria">Abrir minha galeria</Link>`.

- [ ] **Step 1: Write failing route/component tests**

```tsx
expect(screen.getByRole("heading", { name: "Suas fotos estão prontas" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "Abrir minha galeria" })).toHaveAttribute("href", "/minha-experiencia/galeria");
expect(screen.getByRole("img", { name: "Capa da sua galeria" })).toHaveAttribute("src", expect.stringContaining("signed="));
```

- [ ] **Step 2: Verify failure**

Run: `npx.cmd vitest run tests/app/client-gallery-reveal-page.test.tsx --reporter=verbose --maxWorkers=1`  
Expected: FAIL because the page/component do not exist.

- [ ] **Step 3: Implement page and UI**

Use an editorial single-column `section aria-labelledby`, image alt from the read model, visible text CTA, focus styles, and `motion-reduce` styling. Fetch portal context once. If Reveal is unavailable, render neutral availability copy without a Storage request. Do not make client-side requests or pass a raw storage path.

- [ ] **Step 4: Verify UI**

Run: `npx.cmd vitest run tests/app/client-gallery-reveal-page.test.tsx tests/domain/gallery-portal.test.ts --reporter=verbose --maxWorkers=1`  
Expected: PASS for owner, unavailable, CTA, heading, and signed cover behavior.

- [ ] **Step 5: Commit**

```bash
git add app/(client)/minha-experiencia/reveal/page.tsx components/client/gallery-reveal.tsx tests/app/client-gallery-reveal-page.test.tsx
git commit -m "feat: add client gallery reveal"
```

### Task 3: Navigation, tracking, and validation

**Files:**
- Modify: `components/client/client-nav.tsx`
- Modify: `docs/TASKS.md`
- Modify: `tests/app/client-gallery-reveal-page.test.tsx`

**Interfaces:**
- Adds a `Reveal` link to `/minha-experiencia/reveal`, retaining direct `Galeria` access.

- [ ] **Step 1: Write failing navigation assertion**

```tsx
expect(screen.getByRole("link", { name: "Reveal" })).toHaveAttribute("href", "/minha-experiencia/reveal");
```

- [ ] **Step 2: Verify failure**

Run: `npx.cmd vitest run tests/app/client-gallery-reveal-page.test.tsx --reporter=verbose --maxWorkers=1`  
Expected: FAIL because navigation lacks Reveal.

- [ ] **Step 3: Add navigation and update tracking**

Add Reveal without removing Galeria. Mark SCL-503 DONE with merged commit; note SCL-504–SCL-506 and SCL-703 are unblocked but remain pending.

- [ ] **Step 4: Final checks**

Run: `npm.cmd run typecheck; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run lint; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npx.cmd vitest run tests/domain/gallery-portal.test.ts tests/app/client-gallery-reveal-page.test.tsx --reporter=verbose --maxWorkers=1`  
Expected: every command exits 0.

- [ ] **Step 5: Commit**

```bash
git add components/client/client-nav.tsx docs/TASKS.md tests/app/client-gallery-reveal-page.test.tsx
git commit -m "docs: complete SCL-503"
```
