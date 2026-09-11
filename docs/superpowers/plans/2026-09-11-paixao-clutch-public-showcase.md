# Paixão Clutch Public Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an editorial public Paixão Clutch collection and detail pages that reveal only curated data and send contextual availability inquiries to WhatsApp.

**Architecture:** A stable public slug and a server-only minimal projection define the public boundary. Server-rendered pages and the sitemap consume that projection, while admin curation invalidates the public pages after changes.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Drizzle/PostgreSQL, Supabase public storage, Vitest, Testing Library, CSS Modules.

## Global Constraints

- Never edit migrations `0045` or `0046`; generate `0047` plus its Drizzle snapshot/journal entry.
- A public record is exactly `{ id, slug, name, copy, rentalPrice, publicImagePath, featured, sortOrder }`.
- It is a published, eligible, active, available `clutch` with nonempty copy, rental price, slug, and matching `inventory_public_media` in `ready` state.
- Never cross private media paths, signed URLs, replacement/internal prices, reservations, audit records, or admin descriptions into the public projection.
- Price is public BRL information. WhatsApp carries item and price context; no reservation, checkout, payment, or availability promise is in scope.
- Use existing public-site typography/CTA language and native images only for public media URLs.

---

### Task 1: Public curation contract and stable slug

**Files:**
- Modify: `db/schema/inventory.ts`, `domain/inventory/clutch.ts`, `tests/domain/inventory-clutch.test.ts`
- Create: `db/migrations/0047_paixao_clutch_public_slug.sql`, generated `db/migrations/meta/0047_snapshot.json`, `domain/inventory/public-clutch.ts`, `tests/domain/public-clutch.test.ts`
- Modify: `db/migrations/meta/_journal.json`

**Interfaces:**

```ts
export type PublicPaixaoClutch = {
  id: string; slug: string; name: string; copy: string; rentalPrice: string;
  publicImagePath: string; featured: boolean; sortOrder: number;
};
export async function listPublicPaixaoClutches(): Promise<PublicPaixaoClutch[]>;
export async function findPublicPaixaoClutch(slug: string): Promise<PublicPaixaoClutch | null>;
```

- [ ] **Step 1: Write failing domain tests**

Add a curation test that publishes an eligible clutch with public media and expects `paixaoClutchSlug` to be `clutch-dourada-cl-001`, then republish after a name edit and expect the identical slug. Add projection tests that assert this exact safe record:

```ts
expect(await listPublicPaixaoClutches()).resolves.toEqual([{
  id: itemId, slug: "clutch-dourada-cl-001", name: "Clutch dourada",
  copy: "Um brilho discreto.", rentalPrice: "120.00", publicImagePath,
  featured: true, sortOrder: 0,
}]);
expect(result[0]).not.toHaveProperty("replacementValue");
expect(result[0]).not.toHaveProperty("storagePath");
```

Cover no result for non-clutch, inactive, maintenance, ineligible, unpublished, missing copy/price/slug, and missing/mismatched/non-ready public media. Assert featured-first, then sort order and Portuguese name order; assert a missing detail slug returns `null`.

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/domain/inventory-clutch.test.ts tests/domain/public-clutch.test.ts`

Expected: FAIL because no public slug or public projection exists.

- [ ] **Step 3: Implement model, migration, and projection**

Add nullable `paixaoClutchSlug: text("paixao_clutch_slug")`, a partial unique index, and extend both existing clutch checks: non-clutches require a null slug; publication requires a trimmed slug. Generate and inspect `0047` with:

```powershell
npx drizzle-kit generate --name paixao_clutch_public_slug
```

The migration must add the column/index and recreate the two checks without changing prior migrations. Before adding the publication check, backfill any currently published record with stable `clutch-<normalized-code>`; the unique inventory code makes this collision-free even where SQL cannot safely transliterate a name. In `updatePaixaoClutch`, make a private `publicSlug(name, code)` that lowercases, removes accents, hyphenates words, and appends normalized unique code. Assign it only on first valid publication; do not accept it in `updatePaixaoClutchSchema`.

Create server-only `public-clutch.ts`; select every property individually, inner join `inventoryPublicMedia`, and require:

```ts
and(
  eq(inventoryItems.type, "clutch"), eq(inventoryItems.active, true),
  eq(inventoryItems.status, "available"), eq(inventoryItems.paixaoClutchEligible, true),
  eq(inventoryItems.paixaoClutchPublished, true), isNotNull(inventoryItems.paixaoClutchSlug),
  isNotNull(inventoryItems.rentalPrice), isNotNull(inventoryItems.paixaoClutchCopy),
  eq(inventoryPublicMedia.state, "ready"),
  eq(inventoryPublicMedia.publicPath, inventoryItems.paixaoClutchPublicImagePath),
)
```

Order list reads by `desc(featured)`, sort order, then name; find one matching slug with `limit(1)`. Do not reuse the authorized admin list.

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run tests/domain/inventory-clutch.test.ts tests/domain/public-clutch.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add db/schema/inventory.ts db/migrations domain/inventory/clutch.ts domain/inventory/public-clutch.ts tests/domain/inventory-clutch.test.ts tests/domain/public-clutch.test.ts; git commit -m "SCL-557: expose curated public clutches safely"`

---

### Task 2: Editorial collection, detail, and WhatsApp action

**Files:**
- Create: `app/(site)/paixao-clutch/layout.tsx`, `app/(site)/paixao-clutch/page.tsx`, `app/(site)/paixao-clutch/[slug]/page.tsx`, `app/(site)/paixao-clutch/paixao-clutch.module.css`
- Modify: `lib/site/contact.ts`, `app/admin/(protected)/paixao-clutch/actions.ts`, `tests/app/admin-paixao-clutch.test.tsx`
- Create: `tests/app/paixao-clutch-page.test.tsx`, `tests/app/paixao-clutch-detail-page.test.tsx`

**Interfaces:**

```ts
export type PaixaoClutchContactContext = { name: string; rentalPrice: string };
export function paixaoClutchContactUrl(context: PaixaoClutchContactContext): string;
```

- [ ] **Step 1: Write failing UI/action tests**

Mock `listPublicPaixaoClutches` and `findPublicPaixaoClutch` with safe rows. Assert collection title, card link, photo alt, `R$ 120,00`, and no replacement code/reservation text. Assert an empty collection shows an editorial no-items message and an existing generic WhatsApp CTA. For detail assert copy, image, price, related published item, canonical metadata, and CTA URL text containing `Clutch dourada` and `R$ 120,00`; unknown or unlisted slug calls `notFound`.

Add action assertions that curation, media upload/promotion/removal revalidate `/paixao-clutch`, the home page, and the prior/current detail path without reading private media.

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/app/paixao-clutch-page.test.tsx tests/app/paixao-clutch-detail-page.test.tsx tests/app/admin-paixao-clutch.test.tsx`

Expected: FAIL because routes and clutch-specific WhatsApp helper do not exist.

- [ ] **Step 3: Implement routes and contextual action**

Extract the URL validation/fallback in `contact.ts` into private `whatsappUrl(text: string)`, retaining the two existing helpers’ exact text. Implement the clutch helper as:

```ts
const price = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  .format(Number(context.rentalPrice));
return whatsappUrl(`Olá! Quero consultar a disponibilidade da clutch ${context.name}, aluguel de ${price}.`);
```

Mirror `experiencias/layout.tsx` for skip link/header/footer, adding the Paixão Clutch navigation link. The collection server component calls only the safe list and renders the approved editorial hero, responsive mosaic cards, and text-only fallback when empty. The detail calls `findPublicPaixaoClutch`, returns `notFound()` for null, shows breadcrumb/photo/name/copy/BRL price/CTA, and shows safe related items excluding its own ID. Use native `img` tags only for `publicImagePath`, with accurate alt text.

Implement `generateMetadata` in the detail with canonical `/paixao-clutch/${slug}`, item title/description, Open Graph URL, and Twitter title/description. Do not add static params or caching directives: collection changes must be immediately observable after admin updates.

Extend existing admin revalidation helpers to invalidate `/`, collection, and both known former/current slug paths without adding public fields to client admin props. Style only in the new CSS module; reuse `home.module.css` for shared type and CTAs.

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run tests/app/paixao-clutch-page.test.tsx tests/app/paixao-clutch-detail-page.test.tsx tests/app/admin-paixao-clutch.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add app/(site)/paixao-clutch lib/site/contact.ts app/admin/(protected)/paixao-clutch/actions.ts tests/app/paixao-clutch-page.test.tsx tests/app/paixao-clutch-detail-page.test.tsx tests/app/admin-paixao-clutch.test.tsx; git commit -m "SCL-557: add public Paixao Clutch showcase"`

---

### Task 3: Home discovery, sitemap, and task tracking

**Files:**
- Modify: `app/(site)/page.tsx`, `app/(site)/home.module.css`, `app/sitemap.ts`, `tests/app/seo-metadata.test.ts`, `docs/TASKS.md`
- Create: `tests/app/paixao-clutch-home-link.test.tsx`

**Interfaces:** Consumes only `listPublicPaixaoClutches()` to create collection/detail sitemap URLs and a safe compact home teaser.

- [ ] **Step 1: Write failing discovery/SEO tests**

Assert home includes a visible editorial link to `/paixao-clutch`, its teaser never prints price/code/private fields, and it remains useful with an empty list. Update sitemap assertions to exactly include collection and only safe public detail URLs:

```ts
expect(urls).toContain("https://studiocarollucas.com.br/paixao-clutch");
expect(urls).toContain("https://studiocarollucas.com.br/paixao-clutch/clutch-dourada-cl-001");
expect(urls).not.toContain(expect.stringContaining("/admin"));
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/app/paixao-clutch-home-link.test.tsx tests/app/seo-metadata.test.ts`

Expected: FAIL because home and sitemap do not yet disclose the collection.

- [ ] **Step 3: Implement discovery safely**

After the home experience gallery, add a compact editorial Paixão Clutch teaser with a link to the collection. Render one public image only when list has an item; otherwise use the same text/CTA without an image. Do not display price in the teaser. Add focused responsive styles.

Make `sitemap` async and append fixed `/paixao-clutch` plus `listPublicPaixaoClutches().map(({ slug }) => "/paixao-clutch/" + slug)`, preserving public URLs only, weekly frequency, priorities 0.8 for collection and 0.7 for items. Update SCL-557 to DONE in `docs/TASKS.md` only after Task 4 passes; retain SCL-558 as DEFERRED and note that reservation/payment remain out of scope.

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run tests/app/paixao-clutch-home-link.test.tsx tests/app/seo-metadata.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add app/(site)/page.tsx app/(site)/home.module.css app/sitemap.ts tests/app/paixao-clutch-home-link.test.tsx tests/app/seo-metadata.test.ts docs/TASKS.md; git commit -m "SCL-557: surface Paixao Clutch in public discovery"`

---

### Task 4: Integration review and release validation

**Files:** Review all Task 1–3 files; modify only if a failing review test identifies a scoped defect.

- [ ] **Step 1: Run the targeted suite**

Run: `npx vitest run tests/domain/inventory-clutch.test.ts tests/domain/public-clutch.test.ts tests/app/paixao-clutch-page.test.tsx tests/app/paixao-clutch-detail-page.test.tsx tests/app/paixao-clutch-home-link.test.tsx tests/app/admin-paixao-clutch.test.tsx tests/app/seo-metadata.test.ts`

Expected: PASS.

- [ ] **Step 2: Review the diff against security invariants**

Verify: public projection selects no private/admin fields; every operational/public-media state change removes an item from routes and sitemap; no native image receives a signed/private path; CTA claims no availability and creates no reservation; all public paths are invalidated after editorial/media mutation. If any check fails, first add a reproducing test, then fix narrowly and rerun Step 1.

- [ ] **Step 3: Run full validation**

Run: `npm run typecheck; npm run lint; npm run build; git diff --check; git status --short --branch`

Expected: all commands pass. If Google Fonts network fetch blocks build, retain the exact output and report build as blocked rather than passed.

- [ ] **Step 4: Present the result for final product validation**

Show the rendered collection/detail, report each verification command and the privacy review. Only after the user validates the finished showcase, merge/push to `main` as requested.

## Plan self-review

- Spec coverage: Task 1 covers slug/data security; Task 2 collection/detail, CTA and metadata; Task 3 navigation, home and sitemap; Task 4 security review and quality gates.
- Placeholder scan: no unresolved placeholder or undefined implementation step remains.
- Type consistency: every public consumer uses `PublicPaixaoClutch`; detail and sitemap use its `slug`; CTA uses `PaixaoClutchContactContext`.
