# Epic 3 — Minha Experiência Design

**Date:** 2026-09-06  
**Status:** Approved by the user on 2026-09-06
**Scope:** SCL-300 through SCL-305, client-row RLS/grants, Supabase Storage for styling references, and the deferred Shoot+Payment integration test

## Goal

Build the authenticated client portal on top of the same Client, Shoot, Payment, PreparationTask, and status data already used by Studio OS. The portal must make the next action obvious, let the client participate in preparation and styling, and reflect Admin changes without copying operational data into a second model.

The Epic 3 milestone is complete when this path works end to end:

1. Admin creates a client and confirmed shoot.
2. The client enters through a passwordless Magic Link and is linked to the existing Client record.
3. Minha Experiência selects the correct shoot and shows its preparation, financial, and journey state.
4. The client completes an actionable preparation task and adds a styling reference.
5. Admin changes preparation or shoot/production state.
6. The same state appears in the client portal after refresh, with no duplicated records or cached aggregates.

## Confirmed Product Decisions

- The portal opens on the nearest future active shoot.
- If there is no future shoot, it opens on the most recent non-cancelled shoot so post-session, Reveal, and delivery states remain available.
- The client can update preparation tasks, but only tasks explicitly marked as client-actionable.
- Visibility and editability are separate concepts. A visible task can remain read-only.
- Styling is collaborative: staff/admin and the client can add references.
- Client-provided images use Supabase Storage in this epic.
- Storage starts on the Supabase Free plan: private bucket, JPEG/PNG/WebP only, 8 MB per file, at most 20 references per shoot.
- A client can remove only references they uploaded. Staff/admin can manage every reference for the shoot.
- Meu Ensaio shows a concise financial summary: agreed price, confirmed amount paid, remaining balance, and payment status. It does not expose internal notes, proof URLs, or the internal ledger.
- The selected visual direction is **C+**: the journey timeline is the emotional structure; a prominent “Seu próximo passo” block carries the primary action; modules are secondary shortcuts.
- The data-access architecture is hybrid: Next.js owns session verification, account linking, and the protected shell; Supabase clients carrying the user JWT access client-facing data and Storage so RLS is exercised in the real portal path.

## Non-goals

- Reveal/gallery delivery (SCL-503) is not implemented. The shell must not expose a dead Gallery link; it can appear later when a gallery exists.
- Virtual Try-On is outside P1.
- The portal does not edit shoot dates, package, price, payment entries, or production state.
- The portal does not expose staff notes, editor assignment, payment proof, audit data, or other clients.
- No realtime subscription, SWR, or TanStack Query dependency is introduced. Explicit refresh after mutations is sufficient for the MVP.
- Full-resolution finished galleries do not use this Storage bucket. The 1 GB Free-plan allowance is reserved here for lightweight styling references.
- A dedicated CI/test Supabase project remains an infrastructure follow-up. Live tests stay opt-in.

## Experience and Navigation

### Protected shell — SCL-301

`/minha-experiencia` and its child routes share a server-rendered protected layout. It verifies the Supabase session and resolves the linked Client before rendering portal navigation. It never treats Proxy as the only authorization boundary.

Mobile uses a compact bottom navigation; desktop uses a restrained horizontal navigation. Initial destinations are:

- `/minha-experiencia` — journey home;
- `/minha-experiencia/checklist` — visible preparation tasks;
- `/minha-experiencia/ensaio` — shoot details and financial summary;
- `/minha-experiencia/styling` — collaborative references;
- logout — ends the Supabase session and returns to `/login`.

Gallery is omitted until the Reveal/gallery epic provides a valid destination.

### Journey home — SCL-302

The home uses the C+ hierarchy:

1. client greeting and contracted experience;
2. shoot date/time and countdown where applicable;
3. journey timeline derived from Shoot status;
4. preparation progress from visible PreparationTask rows;
5. one primary next action;
6. secondary shortcuts to the active portal modules;
7. a contextual studio tip appropriate to the current phase.

The UX must remain client-facing. Raw enum tokens, database terminology, ProductionJob details, and Admin controls never appear.

### Checklist — SCL-303

The checklist contains only `visible_to_client = true` tasks for the selected shoot. Read-only tasks show status without an interactive control. Tasks with `client_actionable = true` allow the client to move among `pendente`, `em_andamento`, and `concluida`.

Completion timestamps remain consistent with status: completing sets `completed_at`; moving away from completed clears it. The mutation must re-check ownership and actionability at the data boundary instead of trusting disabled UI.

### Meu Ensaio — SCL-304

Meu Ensaio shows:

- date and start time;
- experience/package name and safe client-facing description;
- current journey status in Portuguese;
- location and orientation content available for the MVP;
- preparation summary;
- agreed price, sum of confirmed payments, derived remaining balance, and client-facing payment status;
- a configurable “Falar com o estúdio” link.

Pending or reversed payment rows are not included in the paid total. Payment data is read from the same rows used by Studio OS; no portal-specific balance is stored.

### Styling — SCL-305

Styling displays references for the selected shoot in chronological order. Each item shows the image, optional caption, and whether it came from the client or the studio. The client can upload and caption a new reference and remove only their own items. Staff/admin receive a minimal management surface from the existing shoot detail/preparation area so the collaborative board is usable from both sides.

Uploads validate MIME type and size before transfer. The private bucket repeats the restriction, so client validation is a usability aid rather than the security boundary.

## Authentication and First-access Linking — SCL-300

The existing PKCE Magic Link flow remains the authentication mechanism. Epic 3 completes it by linking the authenticated Supabase user to the pre-existing CRM Client record.

After `exchangeCodeForSession` succeeds, the callback runs a server-only linking service:

1. read the verified Auth user ID and email;
2. normalize the email with trim + lowercase for comparison;
3. query Client rows matching that normalized email;
4. require exactly one match;
5. accept the row when `auth_user_id` is null or already equals the current Auth user;
6. when null, set `auth_user_id` to the current Auth user ID;
7. reject ambiguous matches or a row already linked to another Auth user;
8. redirect successful users to the safe requested portal destination.

The client-facing failure is neutral and does not reveal whether an email exists in the CRM, whether duplicates exist, or whether another account owns the link. Technical context is logged server-side.

`clients.auth_user_id` already has a unique constraint and an FK to `auth.users` with `ON DELETE SET NULL`. No second identity mapping is introduced.

The login action may create an Auth user through `signInWithOtp`, but an unlinked Auth user receives no portal data. Authentication is not authorization.

## Shoot Selection

All routes use one shared selector and one canonical ordering. A caller cannot provide a client ID to widen the query.

Eligible rows must:

- belong to the Client linked to `auth.uid()`;
- have `portal_enabled = true`;
- not have status `cancelado`.

Selection order is:

1. future eligible shoots that are not already `entregue`, ascending by `shoot_date`; choose the first;
2. otherwise, all eligible past/current shoots, descending by `shoot_date`; choose the first.

The fallback deliberately includes `entregue`, allowing the portal to remain useful after delivery. Same-day shoots count as current rather than past. Date comparison and countdown use the studio timezone `America/Manaus`, not UTC or the device timezone.

## Data Model Changes

### `preparation_tasks.client_actionable`

Add a non-null boolean `client_actionable` with default `false`. Add a database constraint that actionability implies visibility:

```text
client_actionable = false OR visible_to_client = true
```

Backfill the existing standard client preparation types as actionable when already visible: `moodboard`, `figurino`, `clutch`, `make`, and `confirmacao_horario`. Keep payment and internal/custom tasks non-actionable unless staff explicitly opts them in.

Update `buildInitialPreparationTasks()` to specify actionability rather than relying on a permissive default. Extend the Admin preparation form so staff can control visibility and actionability, with the UI preventing `client_actionable = true` while hidden.

Add a database trigger plus a validated check constraint to keep status and completion synchronized for every write path: `concluida` requires a non-null `completed_at`, while any other status requires `completed_at = null`. The trigger sets or clears the timestamp; browser clients receive column-level `UPDATE` only on `status`, never on `completed_at`.

### Client-safe Shoot logistics

Add three nullable Shoot fields instead of exposing the existing internal `notes` column:

- `location_name` — client-facing venue label;
- `location_address` — client-facing address or meeting point;
- `client_guidance` — client-facing arrival/preparation guidance.

Expose these fields in the existing Admin shoot create/edit flow. Empty values render as a neutral “confirme com o estúdio” state rather than fabricated content. The contact CTA reads the exact public URL from `NEXT_PUBLIC_STUDIO_WHATSAPP_URL`; add it to `.env.example` and the deployment runbook.

### `styling_references`

Create a new table with focused responsibility:

- `id` — UUID primary key;
- `shoot_id` — required FK to `shoots`, cascade on shoot deletion;
- `storage_path` — required unique object path;
- `caption` — optional client-safe text with an explicit length limit;
- `origin` — enum `client | studio`;
- `uploaded_by_auth_user_id` — nullable FK to `auth.users`, `ON DELETE SET NULL`;
- `created_at` — timezone-aware timestamp.

The nullable uploader preserves the business record if an Auth user is removed. Client deletion permission requires the current non-null uploader ID to equal `auth.uid()`; staff/admin deletion is independent of uploader.

A database-side guard rejects a 21st live reference for the same shoot. The application also checks the limit before upload for a clear message, but the UI check is not authoritative.

## Data-access Boundary, Grants, and RLS

The existing Admin continues using Drizzle through `DATABASE_URL` and explicit role checks. Client-facing reads use a Supabase client carrying the authenticated JWT. Both the server Supabase client and browser Supabase client therefore reach PostgREST/Storage as role `authenticated` and are subject to grants and RLS.

Add a `security definer` ownership helper with an empty/fixed safe search path, conceptually:

```text
owns_portal_shoot(target_shoot_id) =
  exists shoots join clients
  where shoots.id = target_shoot_id
    and shoots.portal_enabled
    and clients.auth_user_id = auth.uid()
```

Use it only to centralize the ownership predicate and avoid recursive policies. It does not grant write access by itself.

Client-facing tables receive only the grants needed for their projected columns:

- `clients` — own ID and name/contact fields required by the shell;
- `shoots` — identity, dates, status, package link, agreed price, payment status, and portal flag;
- `experience_packages` — safe display fields used by Meu Ensaio;
- `payments` — amount/status/date columns needed for confirmed-payment totals;
- `preparation_tasks` — client display fields plus column-level `UPDATE(status)` required by the guarded mutation;
- `styling_references` — safe display/insert fields and guarded delete.

Do not grant blanket `SELECT *` when a table contains internal notes or proof URLs. `anon` receives no client-data grants.

RLS policies enforce:

- Client: only its own linked Client row.
- Shoot: only owned, portal-enabled shoots.
- Payment: only rows for an owned portal shoot and only `status = confirmado`.
- PreparationTask select: owned portal shoot and `visible_to_client = true`.
- PreparationTask update: owned portal shoot and `client_actionable = true`, limited to the status column; the database trigger owns `completed_at`, and Admin service code retains its existing write path.
- StylingReference select/insert: owned portal shoot; client inserts must record `origin = client` and `uploaded_by_auth_user_id = auth.uid()`.
- StylingReference delete: client uploader only; staff/admin may manage all.

Existing staff policies remain intact. Policy tests must prove that adding the client path does not weaken staff/admin boundaries or expose cross-client rows.

## Supabase Storage

Create or declaratively configure a private bucket named `styling-references`:

- `public = false`;
- allowed MIME types: `image/jpeg`, `image/png`, `image/webp`;
- file size limit: 8 MB.

Use an object path that contains authenticated owner and shoot identity, for example:

```text
<auth-user-id>/<shoot-id>/<random-uuid>.<safe-extension>
```

Storage policies allow a client to upload only under their own user prefix and only when the shoot segment resolves to an owned portal shoot. An owner can read references for their shoot, including studio-originated objects, but can delete only objects under their own prefix. Staff/admin can manage the bucket through staff-aware policies or server-side Admin actions.

The UI creates signed read URLs for the private objects. It never stores a public URL in `styling_references`.

Cross-service operations are compensating rather than transactional:

- create: upload object, insert row; if row insertion fails, immediately attempt object removal;
- delete: authorize and delete the row, then remove the object; if object removal fails, log the orphan for cleanup rather than restoring a client-visible broken row.

## Derived Client View

Create one client-safe read model shared by all portal routes. It composes only safe fields and includes:

- linked client identity;
- selected shoot and experience;
- visible preparation tasks;
- confirmed payments needed for the financial summary;
- styling reference metadata;
- derived preparation progress;
- derived paid total and balance;
- countdown/calendar state;
- client-facing journey stage, label, tip, and next action.

No aggregate is persisted. Existing money helpers remain the only arithmetic boundary, and string decimals remain string decimals until converted by `@/lib/money`.

The next action is deterministic:

1. first visible, actionable, incomplete task ordered by due date then creation date;
2. otherwise first visible incomplete read-only task as informational guidance;
3. otherwise a phase-specific message derived from Shoot status.

## Refresh and Mutation Flow

Server Components obtain initial client-safe data through the cookie-bound Supabase server client, which uses the same user JWT and RLS path. Interactive checklist and styling components use the browser Supabase client. After a successful mutation they refetch the shared client view or call `router.refresh()` where server-rendered data owns the screen.

Do not add a browser cache library for this epic. Each screen has one owner for its loaded state, explicit pending/error feedback, and no optimistic success that could contradict the database.

## Error and Empty States

Handle these states explicitly:

- missing/expired session — redirect to `/login` with the safe destination;
- invalid/expired Magic Link — return to login with a generic retry message;
- authenticated but unlinked/ambiguous Client — neutral access-unavailable page with logout/retry;
- linked Client with no portal-enabled shoot — welcoming empty state, no raw error;
- no visible preparation tasks — completed/empty preparation state;
- no styling references — invitation to add the first reference;
- file rejected by type, size, or count — actionable inline validation;
- Supabase/Postgres/Storage failure — client-safe inline error plus structured server/client logging where available.

Raw database, policy, storage, or stack messages are never rendered to the client.

## Accessibility and Responsive Design

- Mobile-first from 320 px upward.
- Native buttons, links, file input, and form controls with visible labels.
- Touch targets around 44 px, visible focus, and no hover-only action.
- Progress includes a text equivalent and ARIA values.
- Timeline meaning never depends on color alone.
- Upload previews include useful alt text derived from captions; decorative imagery uses empty alt text.
- Pending and error feedback uses appropriate live-region semantics.
- The C+ journey remains readable without animation and honors reduced motion.

## Test Strategy

### Pure/unit tests

- shoot selector: future nearest, same-day, past fallback, delivered fallback, cancelled exclusion, and no eligible shoot;
- countdown in `America/Manaus`, including UTC-boundary cases;
- journey-stage and Portuguese-label mapping for every Shoot status;
- next-action priority and deterministic ordering;
- visible/actionable preparation progress;
- confirmed-payment total, balance, clamp behavior, and payment label using existing money helpers;
- upload validation for MIME, 8 MB, and 20-reference limit;
- link-decision logic: one match, no match, duplicate email, already linked to same user, linked to another user.

### Component tests

- shell/navigation and logout affordance;
- C+ home hierarchy and accessible progress;
- actionable versus read-only checklist behavior;
- styling empty, uploading, validation, failure, and owner-delete states;
- Meu Ensaio financial summary without internal fields.

### Opt-in live Supabase integration

Use two disposable Auth users, Client rows, portal-enabled shoots, tasks, payments, and references. Tests must use authenticated Supabase clients, not the privileged Drizzle connection, for the assertions that claim RLS behavior.

Prove:

- each user reads only their own Client/Shoot/payment/task/reference rows;
- a user cannot select a non-owned shoot by guessed ID;
- non-confirmed payments do not appear;
- hidden tasks do not appear;
- non-actionable tasks cannot be changed;
- actionable tasks update status/completion consistently;
- a client cannot delete another uploader's reference;
- private Storage upload/read/delete policies behave as designed;
- the deferred Shoot+Payment composition returns the same paid total, balance, and status expected by the Admin domain logic.

Every live fixture uses unique names/IDs and cleanup in `finally`/`afterAll`, including Storage objects and Auth users. `RUN_LIVE_DB_TESTS` remains opt-in because the project still has no dedicated test database.

### Final verification

- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run check:admin-auth`
- `npm run build`
- one opt-in live-DB run with zero leftover fixtures
- manual Magic Link flow
- manual 320 px/mobile and desktop walkthrough
- end-to-end Admin update → portal refresh verification

## Delivery Decomposition

The implementation plan should preserve the task IDs while adding explicit infrastructure tasks where needed:

1. client-row grants/RLS and RLS integration harness;
2. SCL-300 passwordless linking and protected client boundary;
3. SCL-301 portal shell;
4. SCL-302 shared client view, selector, countdown, progress, and C+ home;
5. SCL-303 actionable checklist plus Admin visibility/actionability controls;
6. SCL-304 Meu Ensaio and Shoot+Payment composition test;
7. SCL-305 styling schema, private bucket, Admin management, and client board;
8. whole-epic security/E2E review and fix wave before push.

Each implementation task must be independently testable, follow TDD, receive spec and quality review, and leave the repository green. Work continues directly on `main` only because that is the established explicit project workflow; push happens at the completed epic boundary.

## Operational Notes

- Record new migrations monotonically in `db/migrations/meta/_journal.json` and verify them against the real Supabase project.
- Do not use `drizzle-kit push` because the live schema intentionally contains hand-written FKs, indexes, checks, and policies not fully represented in Drizzle snapshots.
- Inspect generated constraint names before adding Drizzle declarations to avoid collisions with hand-written schema objects.
- Update `docs/TASKS.md`, `docs/DECISIONS.md`, the Supabase runbook, and `.env.example` for the WhatsApp configuration and Storage setup.
- Reconfirm GitHub Actions and Vercel production after the final epic push.
