# Paixão Clutch Curated Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Paixão Clutch as a compact editorial rental catalog with public attributes and intuitive color/size filters.

**Architecture:** Extend the existing safe public projection with three permitted inventory attributes. Keep data rendering server-side and filters client-side in a focused catalog component.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle, Vitest, Testing Library, CSS Modules.

## Global Constraints

- Public fields may add only `color`, `size`, and `description`; never expose replacement/internal prices, reservations, audit, notes or private media.
- Filters derive only from published public rows, combine color/size, and do not create a search endpoint.
- Preserve rental WhatsApp/detail flow, responsive accessibility, and dynamic rendering.

---

### Task 1: Public attributes contract

**Files:** Modify `domain/inventory/public-clutch.ts`, `tests/domain/public-clutch.test.ts`.

- [ ] **Step 1: Write failing tests**

```ts
expect(await listPublicPaixaoClutches()).resolves.toEqual([expect.objectContaining({
  color: "Dourado", size: "Média", description: "Acabamento metalizado.",
})]);
expect(result[0]).not.toHaveProperty("replacementValue");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/domain/public-clutch.test.ts`

- [ ] **Step 3: Implement minimal projection**

```ts
export type PublicPaixaoClutch = { /* existing fields */ color: string | null; size: string | null; description: string | null };
const publicPaixaoClutchFields = { /* existing fields */, color: inventoryItems.color, size: inventoryItems.size, description: inventoryItems.description };
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `npx vitest run tests/domain/public-clutch.test.ts`

Commit: `git add domain/inventory/public-clutch.ts tests/domain/public-clutch.test.ts; git commit -m "SCL-557: expose public clutch attributes"`

### Task 2: Filterable compact catalog

**Files:** Create `components/site/paixao-clutch-catalog.tsx`; modify `app/(site)/paixao-clutch/page.tsx`, `app/(site)/paixao-clutch/paixao-clutch.module.css`; create `tests/components/paixao-clutch-catalog.test.tsx`, modify `tests/app/paixao-clutch-page.test.tsx`.

- [ ] **Step 1: Write failing UI tests**

```tsx
render(<PaixaoClutchCatalog clutches={rows} />);
fireEvent.click(screen.getByRole("button", { name: "Dourado" }));
expect(screen.getByText("1 clutch encontrada")).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
expect(screen.getByText("2 clutches encontradas")).toBeInTheDocument();
```

Cover combined filters, empty combination, `aria-pressed`, card color/size/description, and no private values.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/components/paixao-clutch-catalog.test.tsx tests/app/paixao-clutch-page.test.tsx`

- [ ] **Step 3: Implement**

Create a client component accepting `PublicPaixaoClutch[]`; derive sorted unique nonempty colors/sizes, maintain `selectedColor`/`selectedSize`, filter with equality, and render semantic toggle buttons. Replace page card markup with it. CSS uses 3 equal desktop columns, 2 tablet columns, 1 mobile column; removes featured spanning/alternating offset; card photo remains 4:5 and description is line-clamped to two lines.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npx vitest run tests/components/paixao-clutch-catalog.test.tsx tests/app/paixao-clutch-page.test.tsx`

Commit: `git add components/site/paixao-clutch-catalog.tsx app/(site)/paixao-clutch tests/components/paixao-clutch-catalog.test.tsx tests/app/paixao-clutch-page.test.tsx; git commit -m "SCL-557: add curated clutch catalog filters"`

### Task 3: Detail attributes and final validation

**Files:** Modify `app/(site)/paixao-clutch/[slug]/page.tsx`, `tests/app/paixao-clutch-detail-page.test.tsx`.

- [ ] **Step 1: Write failing test**

```tsx
expect(screen.getByText("Cor: Dourado")).toBeInTheDocument();
expect(screen.getByText("Tamanho: Média")).toBeInTheDocument();
```

- [ ] **Step 2: RED, implement, GREEN**

Run: `npx vitest run tests/app/paixao-clutch-detail-page.test.tsx`

Render attributes only when present, alongside existing copy/price; retain metadata and WhatsApp behavior. Re-run the same test and expect PASS.

- [ ] **Step 3: Full verification and review**

Run: `npx vitest run tests/domain/public-clutch.test.ts tests/components/paixao-clutch-catalog.test.tsx tests/app/paixao-clutch-page.test.tsx tests/app/paixao-clutch-detail-page.test.tsx; npm run typecheck; npm run lint; npm run build; git diff --check`

Commit only necessary validation fixes. Request review before merge/push.

## Plan self-review

Tasks cover safe public attributes, compact catalog/faceted filtering, detail consistency, responsive layout, test coverage, and no commerce scope.
