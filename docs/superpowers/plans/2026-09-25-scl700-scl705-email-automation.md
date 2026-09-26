# SCL-700 + SCL-705 Email Automation Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist idempotent automation events and per-recipient email deliveries inside the caller's transaction, send them through an encapsulated Resend provider with versioned pt-BR templates, and process them with bounded retry, safe concurrency, observability and a documented manual reprocessing path.

**Architecture:** Migration `0049_email_automation_outbox` adds `automation_events` and `notification_deliveries` (server-only, RLS on, no grants). `domain/automation/**` owns enqueueing, templates, retry policy, the processor (pure, driven by a `DeliveryStore` + `EmailProvider`) and the Drizzle store. `lib/email/**` owns providers and env resolution. A secret-guarded Route Handler at `/api/cron/email-deliveries` runs the processor.

**Tech Stack:** Next.js 16.3 Route Handlers, TypeScript, Drizzle/PostgreSQL, Zod, Vitest, Sentry, `fetch` (no new dependencies).

## Global Constraints

- No new npm dependencies; Resend is called over REST.
- Nothing connects to the database or reads secrets at import/build time.
- Logs never contain recipient addresses, subjects or template data.
- Without `EMAIL_DELIVERY_ENABLED=true`, no real email leaves the app; in `VERCEL_ENV=production` a disabled flag is a configuration error.
- No business flow enqueues email in this change (SCL-701–704 own that).
- The cron route lives outside `app/admin`, so `npm run check:admin-auth` keeps passing; it authorizes with `CRON_SECRET` compared in constant time.

---

### Task 1: Persistence contract (migration 0049)

**Files:**
- Create: `db/schema/automation.ts`, `db/migrations/0049_email_automation_outbox.sql`, `db/migrations/meta/0049_snapshot.json`
- Modify: `db/schema/index.ts`, `db/migrations/meta/_journal.json`
- Test: `tests/db/email-automation-migration.test.ts`, `tests/domain/automation-schema.test.ts`

- [x] **Step 1: Write failing migration/schema tests** asserting enums, tables, unique constraints, checks, due index, FK, RLS + revokes without grants, snapshot `prevId` = 0048 id and journal entry `idx: 49`.
- [x] **Step 2: Hand-write SQL exactly as drizzle-kit would emit it** for the schema, then append RLS/revoke statements; derive `0049_snapshot.json` from `0048_snapshot.json`; add a journal entry with a real `Date.now()`.
- [x] **Step 3: Commit** `SCL-700: add automation outbox tables`.

### Task 2: Templates and retry policy (pure)

**Files:**
- Create: `domain/automation/templates/{define.ts,html.ts,boas-vindas.v1.ts,registry.ts}`, `domain/automation/retry.ts`, `domain/automation/sanitize.ts`
- Test: `tests/domain/automation-templates.test.ts`, `tests/domain/automation-retry.test.ts`

- [x] **Step 1: Failing tests**: latest version resolution, pinned version rendering, HTML escaping, Zod rejection, unknown key/version errors; backoff sequence and cap; transient × permanent classification; error sanitization (emails, `re_` keys, Bearer tokens, truncation).
- [x] **Step 2: Implement** `defineEmailTemplate`, `escapeHtml`, `renderEmailLayout`, registry, `computeRetryDelayMs`, `planDeliveryFailure`, `sanitizeDeliveryError`.
- [x] **Step 3: Commit** `SCL-700: add versioned email templates` and `SCL-705: add bounded retry policy`.

### Task 3: Email providers and configuration

**Files:**
- Create: `lib/email/{provider.ts,resend.ts,log-provider.ts,config.ts}`
- Test: `tests/lib/email-resend.test.ts`, `tests/lib/email-config.test.ts`

- [x] **Step 1: Failing tests** with a fake `fetch`: endpoint, headers (`Authorization`, `Idempotency-Key`), body, message id, retryable 429/5xx/network, permanent 422, redacted errors; config: disabled → log provider, enabled without key/from → error, enabled → Resend, production guard.
- [x] **Step 2: Implement** and commit `SCL-700: encapsulate Resend email provider`.

### Task 4: Enqueue inside the caller's transaction

**Files:**
- Create: `domain/automation/events.ts`
- Test: `tests/domain/automation-events.test.ts`

- [x] **Step 1: Failing tests** with a chainable fake writer: inserts event + deliveries with `onConflictDoNothing`, pins latest template version, normalizes/dedupes recipients, returns the existing event on replay without new deliveries, rejects a key reused for another event, rejects invalid template data before writing.
- [x] **Step 2: Implement** `enqueueAutomationEvent(input, writer = db)` and commit `SCL-700: enqueue idempotent automation events`.

### Task 5: Processor, Drizzle store and manual reprocessing

**Files:**
- Create: `domain/automation/processor.ts`, `domain/automation/delivery-store.ts`, `domain/automation/reprocess.ts`, `lib/observability/report-error.ts`
- Test: `tests/domain/automation-processor.test.ts`, `tests/domain/automation-reprocess.test.ts`, `tests/domain/automation-outbox.integration.test.ts` (gated by `RUN_LIVE_DB_TESTS`)

- [x] **Step 1: Failing tests** with an in-memory store and fake provider: sent path with stable idempotency key, transient failure → `retry` with backoff, exhausted → `failed` + Sentry report, permanent 4xx and unknown template → `failed` immediately, lost lease handled, logs without PII.
- [x] **Step 2: Implement** the processor, the `FOR UPDATE SKIP LOCKED` store, `requeueFailedDelivery`/`cancelDelivery` with audit; commit `SCL-705: process email deliveries with retry`.

### Task 6: Protected cron entry point, env and runbook

**Files:**
- Create: `lib/auth/cron-secret.ts`, `app/api/cron/email-deliveries/route.ts`, `docs/runbooks/email-automation.md`
- Modify: `.env.example`, `docs/runbooks/deploy.md`, `docs/TASKS.md`
- Test: `tests/lib/cron-secret.test.ts`, `tests/app/email-deliveries-cron-route.test.ts`

- [x] **Step 1: Failing tests**: 503 without/short secret, 401 wrong secret (processor untouched), 503 on email config error, 200 summary without PII, 500 + Sentry on unexpected failure; constant-time comparison helper.
- [x] **Step 2: Implement**, document env vars and runbook (config, cron setup, safe manual reprocessing SQL), move SCL-700/SCL-705 to `IN_REVIEW`; commit `SCL-705: add protected email cron route and runbook`.

## Verification

Run in CI (`.github/workflows/ci.yml`): `npm run lint`, `npm run check:admin-auth`, `npm run typecheck`, `npm run test`, `npm run build`.
