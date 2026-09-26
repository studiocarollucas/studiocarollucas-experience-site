# SCL-704 + SCL-721 Review Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ask each delivered client for a Google review exactly once — by email, after delivery and Reveal, with the Review and the outbox event written in one transaction — and offer a dismissible review card in Minha Experiência whose clicks and completion are trackable by staff.

**Architecture:** A scheduler step (sibling cron route) selects delivered shoots with a published gallery and no Google Review, creates the Review through `requestReviewInTransaction` and enqueues `review.requested` in the same transaction; the delivery guard re-checks the Review at send time. The portal reads the same rule server-side, records link opens in the audit log and keeps dismissals in a cookie; the Admin shoot page completes/cancels the Review through `defineAdminAction`. Spec: `docs/superpowers/specs/2026-09-26-scl704-scl721-review-flow-design.md`.

**Tech Stack:** Next.js 16.3 Route Handlers and Server Actions (`cookies()` from `next/headers`), TypeScript, Drizzle/PostgreSQL, Zod, Vitest (no new dependencies).

## Global Constraints

- No migration (`reviews` from 0051 and the outbox from 0049 are enough) and no new npm dependency.
- The review link is server-only config (`STUDIO_GOOGLE_REVIEW_URL`, https); missing config never sends and logs once per run.
- The portal CTA never blocks the portal, the gallery or downloads; client identity only from the session.
- Logs carry identifiers only; nothing connects to the database at import time.

---

### Task 1: Rules, config and template

**Files:**
- Create: `domain/reviews/config.ts`, `domain/automation/templates/pedido-avaliacao.v1.ts`
- Modify: `domain/automation/flows/rules.ts`, `domain/automation/templates/registry.ts`, `.env.example`
- Test: `tests/domain/automation-review-rules.test.ts`, `tests/domain/reviews-config.test.ts`, `tests/domain/automation-templates.test.ts`

- [x] **Step 1: Failing tests**: due only with job `entregue` + `delivery_at` + published gallery + not cancelled, from 3 days after delivery (email window up to 30 days); key `review.requested:<shootId>:google`; guard decision sends only for `solicitado` with the link configured; https-only link config; `pedido-avaliacao` v1 renders pt-BR text + HTML with the Google CTA, escapes values, rejects non-http links.
- [x] **Step 2: Implement** and commit `SCL-704: add review request rules, link config and template`.

### Task 2: Review service in the caller's transaction

**Files:**
- Modify: `domain/reviews/service.ts`
- Test: `tests/domain/reviews-service.test.ts`

- [x] **Step 1: Failing test**: `requestReviewInTransaction(tx, …)` writes and audits with the given transaction and never opens its own.
- [x] **Step 2: Implement** (`requestReview` delegates to it) and commit with Task 3.

### Task 3: Scheduler, guard and cron route (SCL-704)

**Files:**
- Create: `domain/automation/flows/review-requests.ts`, `app/api/cron/review-requests/route.ts`
- Modify: `domain/automation/guard.ts`
- Test: `tests/domain/automation-review-requests.test.ts`, `tests/domain/automation-guard.test.ts`, `tests/app/review-requests-cron-route.test.ts`

- [x] **Step 1: Failing tests**: without link nothing is read/written and one warning is logged; plan skips not-due rows and clients without email and pins the 10:00 Manaus send time; each shoot runs Review + event in one transaction; `created: false` does not enqueue; one failure does not stop the rest (Sentry without PII); guard cancels completed/cancelled/missing Review or missing link; route enforces `CRON_SECRET`.
- [x] **Step 2: Implement** and commit `SCL-704: request post-delivery Google reviews by email`.

### Task 4: Portal CTA (SCL-721)

**Files:**
- Create: `domain/reviews/{portal,portal-server}.ts`, `app/(client)/minha-experiencia/avaliacao/actions.ts`, `components/client/review-prompt.tsx`
- Modify: `app/(client)/minha-experiencia/page.tsx`, `app/(client)/minha-experiencia/galeria/page.tsx`
- Test: `tests/domain/reviews-portal.test.ts`, `tests/app/client-review-actions.test.ts`, `tests/components/client-review-prompt.test.tsx`, `tests/app/client-home-page.test.tsx`, `tests/app/client-gallery-page.test.tsx`

- [x] **Step 1: Failing tests**: prompt only for the latest delivered shoot past the delay, with published gallery, link configured and no completed/cancelled Review; dismissal cookie per shoot; read failure hides the card; open action records `review.link_opened` (creating a `portal` Review when missing) with the session actor and sets the cookie; dismiss action only sets the cookie; card is dismissible, opens the link in a new tab, and pages render with and without it.
- [x] **Step 2: Implement** and commit `SCL-721: add dismissible Google review card to Minha Experiência`.

### Task 5: Admin tracking (SCL-721)

**Files:**
- Create: `domain/reviews/queries.ts`, `app/admin/(protected)/agenda/[id]/review-actions.ts`, `components/admin/shoot-review.tsx`
- Modify: `app/admin/(protected)/agenda/[id]/page.tsx`
- Test: `tests/app/admin-shoot-review.test.tsx`, `tests/app/admin-styling-page.test.tsx`

- [x] **Step 1: Failing tests**: panel shows status, origin, request date and last link open; complete/cancel actions require staff, use the session actor, map `ReviewError` to an actionable message and revalidate the shoot page.
- [x] **Step 2: Implement** and commit `SCL-721: track review completion from the Admin shoot page`.

### Task 6: Docs and status

**Files:**
- Modify: `docs/runbooks/email-automation.md`, `docs/DECISIONS.md`, `docs/TASKS.md` (SCL-704/SCL-721 only)

- [x] **Step 1:** Runbook: env var, new cron, flow row, guard reasons, diagnostics SQL. DECISIONS: trigger rule and link config. TASKS: IN_REVIEW with hand-off notes.
- [x] **Step 2:** Adversarial diff review (lint, `check:admin-auth`, typecheck, tests, build) and commit `SCL-704: document review flow and hand off`.
