# SCL-557 Task 2 report

## Delivered

- Added the public `/paixao-clutch` collection and `/paixao-clutch/[slug]` detail routes, each consuming only the server-only `PublicPaixaoClutch` projection.
- Added the shared public-site route layout, navigation links from the home and experiences navigation, editorial collection empty state, native public-image cards, detail breadcrumb, related clutches, contextual availability CTA, and collection/detail metadata.
- Extracted the validated WhatsApp base URL into a private helper without changing the existing contact or quiz message text. Added `PaixaoClutchContactContext` and the required item-availability message.
- Added revalidation for the public home and collection after curation/media changes, plus a narrowly selected current or retained former public detail slug. The slug read is server-only and returns only the slug needed for invalidation.

## TDD evidence

- RED: the requested focused suite failed before implementation because the public route modules did not exist and the admin actions did not invalidate public routes.
- GREEN: `npx vitest run tests/app/paixao-clutch-page.test.tsx tests/app/paixao-clutch-detail-page.test.tsx tests/app/admin-paixao-clutch.test.tsx` passed: 3 files, 27 tests.

## Verification

- `npx tsc --noEmit --pretty false` passed.
- `npx eslint 'app/(site)/paixao-clutch' 'app/(site)/page.tsx' 'app/(site)/experiencias/layout.tsx' 'app/admin/(protected)/paixao-clutch/actions.ts' 'domain/inventory/clutch.ts' 'lib/site/contact.ts' 'tests/app/paixao-clutch-page.test.tsx' 'tests/app/paixao-clutch-detail-page.test.tsx' 'tests/app/admin-paixao-clutch.test.tsx'` passed.
- `git diff --check` passed.

## Self-review

- Confirmed no collection/detail page uses an admin reader, static params, cache directive, client fetch, or optimized image component for public clutch media.
- Confirmed rendered page tests cover editorial copy, native public image paths, BRL pricing, CTA text, safe related items, empty state, metadata, 404 behavior, and absence of rendered private identifiers.
- Confirmed public invalidation covers the home, collection, and a known retained detail slug without returning storage or media details to the caller.

## Review follow-up

- RED: after review, the focused suite failed with two expected regressions: the collection landmark still announced `Clutches disponíveis`, and reordering did not read the safe public list or invalidate detail pages whose related-clutch order changed.
- Replaced the landmark label with `Curadoria Paixão Clutch`.
- Reorder now reads only `listPublicPaixaoClutches()` after the mutation and invalidates each returned public detail slug, in addition to the home and collection. No private inventory or media fields cross the action boundary.
- Formatted `app/(site)/paixao-clutch/paixao-clutch.module.css` as normal multi-line CSS.
- GREEN: `npx vitest run tests/app/paixao-clutch-page.test.tsx tests/app/paixao-clutch-detail-page.test.tsx tests/app/admin-paixao-clutch.test.tsx` passed: 3 files, 28 tests (2026-09-11 11:28 local).
- `npx tsc --noEmit --pretty false` and `git diff --check` passed after the review follow-up. The scoped ESLint command exited successfully with three expected `no-img-element` warnings, because the task explicitly requires native `<img>` tags for public media.
