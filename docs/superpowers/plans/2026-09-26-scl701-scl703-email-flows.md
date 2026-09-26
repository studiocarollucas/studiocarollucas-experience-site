# SCL-701 + SCL-702 + SCL-703 Email Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enqueue the welcome email with every confirmed reservation, schedule D-7/D-1 reminders in the studio timezone, and announce a published Reveal — each exactly once, re-checked for eligibility at send time, on top of the SCL-700/SCL-705 outbox.

**Architecture:** Business transactions call small flow modules that read the minimum client data and call `enqueueAutomationEvent(input, tx)`. A sibling cron route runs the reminder scheduler. The delivery processor gains an optional eligibility guard that cancels deliveries whose context no longer holds. Spec: `docs/superpowers/specs/2026-09-26-scl701-scl703-email-flows-design.md`.

**Tech Stack:** Next.js 16.3 Route Handlers, TypeScript, Drizzle/PostgreSQL, Zod, Vitest, `Intl` (no new dependencies).

## Global Constraints

- No migration (the outbox tables from 0049 are enough) and no new npm dependency.
- Released template versions are immutable: the welcome copy ships as `boas-vindas` v2.
- A missing/invalid client email or site URL never aborts the business action.
- Logs carry identifiers only; nothing connects to the database at import time.

---

### Task 1: Pure helpers, rules and templates

**Files:**
- Create: `domain/automation/{studio-time,recipients,links}.ts`, `domain/automation/flows/rules.ts`, `domain/automation/templates/{format,boas-vindas.v2,lembrete-d7.v1,lembrete-d1.v1,galeria-publicada.v1}.ts`
- Modify: `domain/portal/countdown.ts` (export `STUDIO_TIME_ZONE`), `domain/automation/templates/registry.ts`
- Test: `tests/domain/automation-flow-rules.test.ts`, `tests/domain/automation-templates.test.ts`, `tests/domain/automation-events.test.ts`, `tests/domain/automation-outbox.integration.test.ts`

- [x] **Step 1: Failing tests**: studio wall time → UTC instant (Manaus), date arithmetic, first name/recipient normalization, absolute URLs with fallback, welcome eligibility, reminder window (D-1 exact, D-7 2–7 days and created before D-7), send-time decisions; v2/new templates render pt-BR text + HTML, escape values, omit CTA without portal, never leak internal fields; latest `boas-vindas` is v2.
- [x] **Step 2: Implement** and commit `SCL-701: add welcome v2, reminder and reveal email templates`.

### Task 2: Send-time eligibility guard in the processor

**Files:**
- Create: `domain/automation/guard.ts`
- Modify: `domain/automation/processor.ts`, `domain/automation/delivery-store.ts`, `app/api/cron/email-deliveries/route.ts`
- Test: `tests/domain/automation-processor.test.ts`, `tests/domain/automation-guard.test.ts`, `tests/app/email-deliveries-cron-route.test.ts`

- [x] **Step 1: Failing tests**: a guard veto marks the delivery `cancelled` (conditional on the claim) without calling the provider; a guard error is a retryable failure; the Drizzle-backed guard loads the event and entity and cancels cancelled/moved shoots and unpublished galleries; the cron route wires the guard.
- [x] **Step 2: Implement** and commit `SCL-702: re-check delivery eligibility at send time`.

### Task 3: SCL-701 welcome on confirmed reservation

**Files:**
- Create: `domain/automation/flows/shoot-welcome.ts`
- Modify: `domain/shoots/create-confirmed-shoot.ts`
- Test: `tests/domain/automation-shoot-welcome.test.ts`, `tests/domain/create-confirmed-shoot-welcome.test.ts`, `tests/domain/lead-converted-shoot.test.ts`

- [x] **Step 1: Failing tests**: enqueues one `shoot.confirmed` event keyed by shoot with v2 data and portal CTA only when enabled; skips without email, for past/historical shoots; runs inside the creation transaction (Admin and Lead paths) and rolls back with it.
- [x] **Step 2: Implement** and commit `SCL-701: enqueue welcome email with confirmed reservations`.

### Task 4: SCL-702 reminder scheduler and cron route

**Files:**
- Create: `domain/automation/flows/shoot-reminders.ts`, `app/api/cron/shoot-reminders/route.ts`
- Modify: `docs/runbooks/email-automation.md`
- Test: `tests/domain/automation-shoot-reminders.test.ts`, `tests/app/shoot-reminders-cron-route.test.ts`

- [x] **Step 1: Failing tests**: plans D-7/D-1 per window with key `shoot.reminder_<kind>:<shootId>:<date>` and 09:00 Manaus send time; skips existing keys, clients without email and not-due shoots; one failing enqueue does not stop the rest; route enforces `CRON_SECRET` (503/401), returns counters, 500 + Sentry on crash.
- [x] **Step 2: Implement**, document cadence in the runbook, commit `SCL-702: schedule D-7 and D-1 reminders`.

### Task 5: SCL-703 Reveal notification on publish

**Files:**
- Create: `domain/automation/flows/gallery-published.ts`
- Modify: `domain/gallery/assets.ts`
- Test: `tests/domain/automation-gallery-published.test.ts`, `tests/domain/gallery-assets.test.ts`

- [x] **Step 1: Failing tests**: one `gallery.published` event keyed by gallery with an authenticated Reveal URL; no event without photos or email; enqueue happens inside the publish transaction and nowhere else.
- [x] **Step 2: Implement** and commit `SCL-703: notify the client when the Reveal is published`.

### Task 6: Board

- [x] Move SCL-701/702/703 to `IN_REVIEW` in `docs/TASKS.md` (sections + summary rows only); commit `SCL-703: move SCL-701..703 to IN_REVIEW`.

## Verification

Run in CI (`.github/workflows/ci.yml`): `npm run lint`, `npm run check:admin-auth`, `npm run typecheck`, `npm run test`, `npm run build`. Locally (no `node_modules` in this environment): `node scripts/check-admin-auth.mjs`, `node scripts/check-migration-journal.mjs`.
