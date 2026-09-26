# SCL-405/406 Launch SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the public-launch gaps of SCL-405 and SCL-406: tracked contextual WhatsApp CTAs, schema.org JSON-LD, Search Console verification, quiz start/completion events and a complete sitemap.

**Architecture:** Contact URLs stay centralized in `lib/site/contact.ts`; analytics stays behind the allow-listed `trackPublicEvent` facade; JSON-LD builders live in `lib/site/structured-data.ts` and render through a native `<script type="application/ld+json">` with `<` escaped, per the Next 16 JSON-LD guide.

**Tech Stack:** Next.js 16 Metadata APIs, React 19 Server/Client Components, TypeScript, Vitest.

## Global Constraints

- No PII in analytics payloads: only `source` and an optional public experience slug.
- No invented business data: address and profiles come from optional `STUDIO_PUBLIC_*` env vars and are omitted when absent; no prices, ratings or opening hours.
- No migrations and no new dependencies.

---

### Task 1: Tracked experience WhatsApp CTAs (SCL-405)

**Files:**
- Modify: `lib/site/analytics.ts`, `lib/site/contact.ts`, `app/(site)/page.tsx`, `app/(site)/experiencias/page.tsx`, `app/(site)/experiencias/[slug]/page.tsx`, `app/(site)/paixao-clutch/page.tsx`, `components/site/paixao-clutch-reservation-form.tsx`, `.env.example`
- Create: `components/site/experience-whatsapp-link.tsx`, `tests/components/experience-whatsapp-link.test.tsx`, `tests/lib/site/contact.test.ts`
- Extend: `tests/lib/analytics.test.ts`, `tests/app/experiences-page.test.tsx`, `tests/app/paixao-clutch-home-link.test.tsx`, `tests/app/paixao-clutch-page.test.tsx`

- [x] **Step 1: Write failing tests** — `experience_whatsapp_clicked` forwards `{ source, experience }` only; link fires the event and keeps `href`; detail page CTAs track `{ source: "experience_detail", experience: "familia" }`; home caption follows the configured number; clutch collection message names Paixão Clutch.
- [x] **Step 2: Implement** `ExperienceWhatsAppLink`, `studioWhatsAppLabel()`, `paixaoClutchCollectionContactUrl()`, optional `formattedPrice`, and swap the raw `<a>` CTAs.
- [x] **Step 3: Commit** `SCL-405: track experience WhatsApp CTAs with origin`.

### Task 2: Quiz lifecycle events (SCL-406)

**Files:**
- Modify: `lib/site/analytics.ts`, `components/site/quiz/quiz-flow.tsx`
- Extend: `tests/components/quiz-flow.test.tsx`

- [x] **Step 1: Write failing tests** — first choice emits `quiz_started` once; successful recommendation emits `quiz_completed`; failure does not.
- [x] **Step 2: Implement** with a `useRef` guard reset on restart.
- [x] **Step 3: Commit** `SCL-406: track quiz started and completed`.

### Task 3: JSON-LD, Search Console and sitemap (SCL-406)

**Files:**
- Create: `lib/site/structured-data.ts`, `components/site/json-ld.tsx`, `tests/lib/site/structured-data.test.ts`
- Modify: `app/layout.tsx`, `app/(site)/page.tsx`, `app/(site)/experiencias/[slug]/page.tsx`, `app/sitemap.ts`, `.env.example`
- Extend: `tests/app/seo-metadata.test.ts`, `tests/app/experiences-page.test.tsx`

- [x] **Step 1: Write failing tests** — `ProfessionalService` without address by default, address/sameAs only from env, `Service` per experience without offers, `<` escaped, `siteVerification()` omitted when empty, sitemap lists every experience slug.
- [x] **Step 2: Implement** builders, `<JsonLd>` and metadata `verification`.
- [x] **Step 3: Commit** `SCL-406: add schema.org JSON-LD`, `SCL-406: prepare Search Console verification`, `SCL-406: list experience pages in sitemap`.

### Task 4: Task board

- [x] Update `docs/TASKS.md` (SCL-405/406 → IN_REVIEW, branch, criteria).
- [ ] CI: `npm run lint`, `npm run check:admin-auth`, `npm run typecheck`, `npm run test`, `npm run build` (runs on the PR; dependencies cannot be installed in the authoring sandbox).
