# Paixão Clutch Public Reservation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a guest to request a published clutch for a date range, with a 24-hour pending hold and staff approval, without payment.

**Architecture:** Extend `inventory_reservations` so a rental can exist without a shoot and can persist guest contact and expiry. A server-only rental reservation domain owns validation, locking, conflicts, expiry and audit. Public UI talks only to a narrow server action and a minimal DTO; admin actions retain staff authorization and initiate a manual WhatsApp conversation.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Drizzle/PostgreSQL, Zod, Vitest, Testing Library, CSS Modules.

## Global Constraints

- Rental reservations use `purpose: "rental"`; locações internas vinculadas a ensaio mantêm o comportamento atual, e a nova locação pública não possui ensaio.
- A pending rental expires 24 hours after creation; `confirmed` reservations never expire automatically.
- Overlapping `confirmed` and unexpired `pending` rentals block a published clutch.
- Public requests are guest-only: required name, WhatsApp and inclusive start/end dates; email optional.
- Public code resolves an item through the published public clutch projection, never a submitted inventory ID.
- No payment, account, automatic notification, private media, signed URL, admin data or third-party reservation data is exposed.
- Staff/admin approval, release and audit are mandatory; WhatsApp is a manually opened contextual link.

---

### Task 1: Rental reservation persistence contract

**Files:**
- Create: `db/migrations/0048_public_clutch_rental_reservations.sql`
- Modify: `db/schema/inventory.ts`
- Modify: `db/migrations/meta/_journal.json` and generated `0048_snapshot.json`
- Test: `tests/db/public-clutch-rental-reservations-migration.test.ts`, `tests/domain/inventory-schema.test.ts`

**Produces:** nullable `shootId`, nullable guest fields, nullable `expiresAt`, and database checks that constrain guest contact to `rental` and shoot linkage to `shoot`.

- [ ] **Step 1: Write failing migration/schema tests**

```ts
expect(normalizedSql).toContain('alter table "inventory_reservations" alter column "shoot_id" drop not null');
expect(normalizedSql).toContain('add column "guest_name" text');
expect(normalizedSql).toContain('add column "expires_at" timestamp with time zone');
expect(Object.keys(inventoryReservations)).toEqual(expect.arrayContaining([
  "guestName", "guestPhone", "guestEmail", "expiresAt",
]));
```

- [ ] **Step 2: Verify RED**

Run: `node node_modules/vitest/vitest.mjs run tests/db/public-clutch-rental-reservations-migration.test.ts tests/domain/inventory-schema.test.ts --maxWorkers=1`

Expected: FAIL because migration and columns do not exist.

- [ ] **Step 3: Generate and constrain the migration**

Use Drizzle generation after updating `inventoryReservations` with:

```ts
shootId: uuid("shoot_id").references(() => shoots.id),
guestName: text("guest_name"),
guestPhone: text("guest_phone"),
guestEmail: text("guest_email"),
expiresAt: timestamp("expires_at", { withTimezone: true }),
```

Add SQL checks equivalent to:

```sql
check ((purpose = 'shoot' and shoot_id is not null and guest_name is null and guest_phone is null)
    or (purpose = 'rental' and ((shoot_id is not null and guest_name is null and guest_phone is null)
      or (shoot_id is null and guest_name is not null and guest_phone is not null))));
check (purpose = 'rental' or expires_at is null);
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `node node_modules/vitest/vitest.mjs run tests/db/public-clutch-rental-reservations-migration.test.ts tests/domain/inventory-schema.test.ts --maxWorkers=1`

Expected: PASS.

```bash
git add db/migrations/0048_public_clutch_rental_reservations.sql db/migrations/meta db/schema/inventory.ts tests/db/public-clutch-rental-reservations-migration.test.ts tests/domain/inventory-schema.test.ts
git commit -m "SCL-557: store public clutch rental requests"
```

### Task 2: Server-only rental reservation domain

**Files:**
- Create: `domain/inventory/public-rental-reservation.ts`
- Create: `domain/inventory/public-rental-reservation-schema.ts`
- Modify: `domain/inventory/reservations.ts`
- Test: `tests/domain/public-rental-reservation.test.ts`

**Consumes:** Task 1 reservation fields and the existing advisory-lock conflict pattern.

**Produces:** `createPublicClutchRentalReservation(input)`, `listPublicClutchUnavailableRanges(slug)`, and `decidePublicClutchRentalReservation(input, actorUserId)`.

- [ ] **Step 1: Write failing domain tests**

```ts
await expect(createPublicClutchRentalReservation({
  slug: "clutch-dourada", startsOn: "2030-05-10", endsOn: "2030-05-12",
  guestName: "Ana Silva", guestPhone: "92999990000",
})).resolves.toMatchObject({ status: "pending", expiresAt: expect.any(Date) });

await expect(createPublicClutchRentalReservation(overlappingInput)).rejects.toThrow("indisponível");
await expect(createPublicClutchRentalReservation({ ...input, slug: "privada" })).rejects.toThrow("indisponível");
```

Cover inclusive overlap, expired pending rows not blocking, confirmation blocking forever, 24-hour expiry, malformed contact/date, a maximum of three requests from the same normalized phone in one hour, and no ID/private path in public return data. Cover staff-only approve/release and audit events.

- [ ] **Step 2: Verify RED**

Run: `node node_modules/vitest/vitest.mjs run tests/domain/public-rental-reservation.test.ts --maxWorkers=1`

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement schemas and transaction**

Define public input/output explicitly:

```ts
export const publicClutchRentalRequestSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  startsOn: z.string().date(), endsOn: z.string().date(),
  guestName: z.string().trim().min(2).max(120),
  guestPhone: z.string().trim().min(8).max(30),
  guestEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
}).refine(({ startsOn, endsOn }) => endsOn >= startsOn, { path: ["endsOn"], message: "devolução anterior à retirada" });

export type PublicRentalReservationResult = {
  reservationCode: string; status: "pending"; expiresAt: string;
};
```

In one transaction, resolve the item via the published-clutch predicate, acquire the existing item advisory lock, treat `(pending AND expires_at > now()) OR confirmed` as blocking, insert a `rental/pending` row with `expiresAt = now + 24h`, and write an audit event without returning contact data. Add a staff-only decision function: approve changes pending to confirmed; release changes it to released with cancellation metadata.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node node_modules/vitest/vitest.mjs run tests/domain/public-rental-reservation.test.ts tests/domain/inventory-reservations.test.ts --maxWorkers=1`

Expected: PASS.

```bash
git add domain/inventory/public-rental-reservation.ts domain/inventory/public-rental-reservation-schema.ts domain/inventory/reservations.ts tests/domain/public-rental-reservation.test.ts
git commit -m "SCL-557: add safe public clutch rental domain"
```

### Task 3: Public reservation form and server action

**Files:**
- Create: `components/site/paixao-clutch-reservation-form.tsx`
- Create: `app/(site)/paixao-clutch/[slug]/reservation-actions.ts`
- Modify: `app/(site)/paixao-clutch/[slug]/page.tsx`
- Modify: `app/(site)/paixao-clutch/paixao-clutch.module.css`
- Test: `tests/components/paixao-clutch-reservation-form.test.tsx`, `tests/app/paixao-clutch-reservation-actions.test.ts`

**Consumes:** `createPublicClutchRentalReservation` and its minimal result.

**Produces:** an accessible inline guest reservation form on published detail pages.

- [ ] **Step 1: Write failing UI/action tests**

```tsx
render(<PaixaoClutchReservationForm slug="clutch-dourada" name="Clutch dourada" />);
expect(screen.getByLabelText("Data de retirada")).toBeRequired();
expect(screen.getByLabelText("WhatsApp")).toBeRequired();
fireEvent.submit(screen.getByRole("form", { name: /reservar clutch dourada/i }));
expect(await screen.findByRole("alert")).toHaveTextContent("Preencha");
```

Mock the action to assert a success protocol/expiry state, unavailable error, disabled submit state and that no inventory ID is rendered or submitted. Action tests must verify the slug is the only item identity forwarded and that domain errors become safe Portuguese field/form messages.

- [ ] **Step 2: Verify RED**

Run: `node node_modules/vitest/vitest.mjs run tests/components/paixao-clutch-reservation-form.test.tsx tests/app/paixao-clutch-reservation-actions.test.ts --maxWorkers=1`

Expected: FAIL because form/action do not exist.

- [ ] **Step 3: Implement the inline interaction**

Use `useActionState` and a form action accepting only `FormData`. The page passes `{ slug, name }`; the action parses `startsOn`, `endsOn`, `guestName`, `guestPhone`, `guestEmail` and calls the domain function. Render a confirmation such as:

```tsx
<p role="status">Pedido recebido. Ele fica reservado para análise até {expiresAt}.</p>
```

Preserve a secondary WhatsApp consultation link. Use native date inputs with `min={studioDate()}`, labels, errors with `aria-describedby`, and `aria-live` status. Do not list availability ranges or reservation identities publicly.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node node_modules/vitest/vitest.mjs run tests/components/paixao-clutch-reservation-form.test.tsx tests/app/paixao-clutch-reservation-actions.test.ts tests/app/paixao-clutch-detail-page.test.tsx --maxWorkers=1`

Expected: PASS.

```bash
git add components/site/paixao-clutch-reservation-form.tsx 'app/(site)/paixao-clutch/[slug]' 'app/(site)/paixao-clutch/paixao-clutch.module.css' tests/components/paixao-clutch-reservation-form.test.tsx tests/app/paixao-clutch-reservation-actions.test.ts
git commit -m "SCL-557: add guest clutch reservation form"
```

### Task 4: Staff review and manual WhatsApp response

**Files:**
- Modify: `domain/inventory/clutch.ts`
- Modify: `app/admin/(protected)/paixao-clutch/actions.ts`
- Modify: `app/admin/(protected)/paixao-clutch/page.tsx`
- Modify: `components/admin/paixao-clutch-catalog.tsx`
- Test: `tests/domain/inventory-clutch.test.ts`, `tests/app/admin-paixao-clutch.test.tsx`

**Consumes:** rental decision function from Task 2.

**Produces:** staff-only pending-rental cards with approve/release and contextual WhatsApp links.

- [ ] **Step 1: Write failing admin/domain tests**

```tsx
expect(screen.getByText("Pedidos de reserva")).toBeInTheDocument();
expect(screen.getByRole("button", { name: /aprovar pedido de Ana Silva/i })).toBeInTheDocument();
expect(screen.getByRole("link", { name: /avisar Ana Silva no WhatsApp/i })).toHaveAttribute("href", expect.stringContaining("wa.me"));
```

Assert the admin projection includes guest contact only for staff, omits expired pending rows from active blocking status, actions reject client/anonymous actors, approve/release revalidate the admin and public detail paths, and WhatsApp text includes only the staff-visible request, decision, clutch and dates.

- [ ] **Step 2: Verify RED**

Run: `node node_modules/vitest/vitest.mjs run tests/domain/inventory-clutch.test.ts tests/app/admin-paixao-clutch.test.tsx --maxWorkers=1`

Expected: FAIL because request controls/projection are absent.

- [ ] **Step 3: Implement admin controls**

Extend the staff catalog projection with a `rentalRequests` DTO containing `id`, guest fields, dates, status and expiry. Add `approvePublicClutchRentalAction` and `releasePublicClutchRentalAction`, each using existing staff action/result patterns and revalidating `/admin/paixao-clutch`, `/paixao-clutch`, and the affected public slug. Render pending request cards separately from editorial fields; use `contactUrl`/a dedicated safe formatter to create the manual WhatsApp `href`, never a background send.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node node_modules/vitest/vitest.mjs run tests/domain/inventory-clutch.test.ts tests/app/admin-paixao-clutch.test.tsx --maxWorkers=1`

Expected: PASS.

```bash
git add domain/inventory/clutch.ts 'app/admin/(protected)/paixao-clutch' components/admin/paixao-clutch-catalog.tsx tests/domain/inventory-clutch.test.ts tests/app/admin-paixao-clutch.test.tsx
git commit -m "SCL-557: let staff decide clutch rental requests"
```

### Task 5: Regression, privacy and release verification

**Files:**
- Modify only files needed to correct failing validation.

- [ ] **Step 1: Add end-to-end boundary regressions**

Add assertions that public collection/detail/reservation UI does not render `guestPhone`, `guestEmail`, internal reservation IDs, replacement value, private media paths or signed URLs; assert expired pending rows do not block a new request and confirmed rows do.

- [ ] **Step 2: Run focused verification**

Run:

```bash
node node_modules/vitest/vitest.mjs run tests/domain/public-rental-reservation.test.ts tests/domain/inventory-reservations.test.ts tests/domain/inventory-clutch.test.ts tests/components/paixao-clutch-reservation-form.test.tsx tests/app/paixao-clutch-reservation-actions.test.ts tests/app/paixao-clutch-detail-page.test.tsx tests/app/admin-paixao-clutch.test.tsx --maxWorkers=1
npx eslint domain/inventory/public-rental-reservation.ts domain/inventory/public-rental-reservation-schema.ts components/site/paixao-clutch-reservation-form.tsx 'app/(site)/paixao-clutch/[slug]' 'app/admin/(protected)/paixao-clutch' components/admin/paixao-clutch-catalog.tsx
git diff --check
```

Expected: zero test failures, zero lint errors, and no whitespace errors. Record any pre-existing global typecheck/build blockers separately rather than masking them.

- [ ] **Step 3: Request review before merge**

Request independent review against this plan, specifically checking authorization, public DTO boundaries, race-safe locking and expiry semantics. Fix every P0/P1 before integration.

## Plan self-review

- Scope coverage: Tasks 1–2 implement persistence, expiry, conflict, audit and public safety; Task 3 implements the guest form; Task 4 implements staff decisions and manual WhatsApp; Task 5 verifies privacy and regression boundaries.
- Placeholder scan: no TBD/TODO or deferred implementation steps.
- Type consistency: public input is `publicClutchRentalRequestSchema`; public success is `PublicRentalReservationResult`; staff decisions are owned by `decidePublicClutchRentalReservation`.
