# SCL-553 Inventory Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow staff to reserve physical inventory for a Shoot, identify date conflicts, and record an explicit, audited staff exception.

**Architecture:** A reservation table owns the item/shoot interval and decision history. A server-only domain service detects conflict in a database transaction; the Shoot detail page consumes its read model and guarded actions.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle/PostgreSQL, Supabase RLS, Zod, Vitest, Tailwind.

## Global Constraints

- Read relevant Next.js 16 docs in `node_modules/next/dist/docs/` before App Router edits.
- History is never deleted; cancellation releases the item by status.
- A conflict only proceeds when `overrideConflict: true` and a non-empty reason are supplied by staff.
- Inventory reservations remain staff/admin-only, with RLS plus domain authorization.
- Keep `purpose: "shoot" | "rental"`; this task creates only Shoot reservations. No rental checkout, payment, or RentalOrder.
- Serialize migration artifacts after `0038_inventory_foundation`.

---

### Task 1: Reservation schema and migration

**Files:**
- Modify: `db/schema/inventory.ts`
- Modify: `db/schema/index.ts`
- Create: `db/migrations/0039_inventory_reservations.sql`
- Create: `db/migrations/meta/0039_snapshot.json`
- Modify: `db/migrations/meta/_journal.json`
- Modify: `tests/domain/inventory-schema.test.ts`
- Create: `tests/db/inventory-reservations-migration.test.ts`

**Interfaces:**
- Produces `inventoryReservationPurposeEnum`, `inventoryReservationStatusEnum`, `inventoryReservations`, `InventoryReservation`, and `NewInventoryReservation`.
- Statuses are `pending | confirmed | cancelled | released`; only pending/confirmed block another interval.

- [ ] **Step 1: Write failing schema/migration tests**

```ts
expect(inventoryReservationPurposeValues).toEqual(["shoot", "rental"]);
expect(inventoryReservationStatusValues).toEqual(["pending", "confirmed", "cancelled", "released"]);
expect(Object.keys(inventoryReservations)).toEqual(expect.arrayContaining([
  "inventoryItemId", "shootId", "purpose", "startsOn", "endsOn", "status",
  "cancelledAt", "cancelledByUserId", "overrideReason", "overriddenByUserId", "overriddenAt",
]));
expect(sql).toContain("create policy inventory_reservations_staff_access");
```

- [ ] **Step 2: Verify failure**

Run: `npx.cmd vitest run tests/domain/inventory-schema.test.ts tests/db/inventory-reservations-migration.test.ts --reporter=verbose --maxWorkers=1`  
Expected: FAIL because the reservation contract and migration do not exist.

- [ ] **Step 3: Implement the contract**

```ts
export const inventoryReservationPurposeValues = ["shoot", "rental"] as const;
export const inventoryReservationStatusValues = ["pending", "confirmed", "cancelled", "released"] as const;
export const inventoryReservations = pgTable("inventory_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id),
  shootId: uuid("shoot_id").notNull().references(() => shoots.id),
  purpose: inventoryReservationPurposeEnum("purpose").notNull().default("shoot"),
  startsOn: date("starts_on").notNull(), endsOn: date("ends_on").notNull(),
  status: inventoryReservationStatusEnum("status").notNull().default("pending"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledByUserId: uuid("cancelled_by_user_id").references(() => profiles.id),
  overrideReason: text("override_reason"),
  overriddenByUserId: uuid("overridden_by_user_id").references(() => profiles.id),
  overriddenAt: timestamp("overridden_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Create migration 0039 with FKs, `ends_on >= starts_on`, partial item/date index for blocking statuses, RLS, authenticated staff policy, revoked anonymous table access, and enum grants matching 0038. Generate the snapshot with `npm run db:generate`; retain only 0039 artifacts and journal entry.

- [ ] **Step 4: Verify migration**

Run: `npx.cmd vitest run tests/domain/inventory-schema.test.ts tests/db/inventory-reservations-migration.test.ts --reporter=verbose --maxWorkers=1; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run predb:migrate`  
Expected: PASS and journal guard exits 0.

- [ ] **Step 5: Commit**

```bash
git add db/schema/inventory.ts db/schema/index.ts db/migrations/0039_inventory_reservations.sql db/migrations/meta/0039_snapshot.json db/migrations/meta/_journal.json tests/domain/inventory-schema.test.ts tests/db/inventory-reservations-migration.test.ts
git commit -m "feat: add inventory reservation schema"
```

### Task 2: Conflict-aware domain service

**Files:**
- Create: `domain/inventory/reservation-schema.ts`
- Create: `domain/inventory/reservations.ts`
- Create: `tests/domain/inventory-reservations.test.ts`

**Interfaces:**
- Produces `createShootInventoryReservation(input, actorUserId)`, `cancelInventoryReservation(id, actorUserId)`, and `listReservationsForShoot(shootId)`.
- Input is `{ inventoryItemId, shootId, startsOn, endsOn, overrideConflict?: boolean, overrideReason?: string }`.

- [ ] **Step 1: Write failing behavior tests**

```ts
await expect(createShootInventoryReservation(baseInput, "staff-1")).resolves.toMatchObject({ status: "confirmed" });
await expect(createShootInventoryReservation(conflictingInput, "staff-1")).rejects.toThrow("conflito de reserva");
await expect(createShootInventoryReservation({ ...conflictingInput, overrideConflict: true }, "staff-1")).rejects.toThrow("justificativa");
await expect(createShootInventoryReservation({ ...conflictingInput, overrideConflict: true, overrideReason: "Aprovado pela produção" }, "staff-1")).resolves.toMatchObject({ overriddenByUserId: "staff-1" });
```

- [ ] **Step 2: Verify failure**

Run: `npx.cmd vitest run tests/domain/inventory-reservations.test.ts --reporter=verbose --maxWorkers=1`  
Expected: FAIL because the service is absent.

- [ ] **Step 3: Implement atomic conflict and audit behavior**

```ts
export const createShootInventoryReservationSchema = z.object({
  inventoryItemId: z.string().uuid(), shootId: z.string().uuid(),
  startsOn: z.string().date(), endsOn: z.string().date(),
  overrideConflict: z.boolean().default(false), overrideReason: z.string().trim().min(1).optional(),
}).refine((v) => v.endsOn >= v.startsOn, { path: ["endsOn"], message: "fim anterior ao início" })
  .refine((v) => !v.overrideConflict || Boolean(v.overrideReason), { path: ["overrideReason"], message: "justificativa obrigatória" });
```

Inside a transaction, take a PostgreSQL advisory transaction lock derived from the inventory item id, query overlapping pending/confirmed rows using `starts_on <= endsOn AND ends_on >= startsOn`, reject non-overrides, write exception fields only after explicit approval, insert the row, and call `recordAuditEvent` via the transaction writer. Cancellation sets status/auditor/timestamp and writes audit action `inventory_reservation.cancelled`; it never deletes.

- [ ] **Step 4: Verify behavior**

Run: `npx.cmd vitest run tests/domain/inventory-reservations.test.ts --reporter=verbose --maxWorkers=1`  
Expected: PASS for overlap, explicit override, reason, cancellation, and audit.

- [ ] **Step 5: Commit**

```bash
git add domain/inventory/reservation-schema.ts domain/inventory/reservations.ts tests/domain/inventory-reservations.test.ts
git commit -m "feat: enforce inventory reservation conflicts"
```

### Task 3: Shoot-detail reservation UI

**Files:**
- Modify: `domain/shoots/queries.ts`
- Create: `app/admin/(protected)/agenda/[id]/inventory-actions.ts`
- Create: `components/admin/inventory-reservations.tsx`
- Modify: `app/admin/(protected)/agenda/[id]/page.tsx`
- Create: `tests/app/admin-inventory-reservations.test.tsx`

**Interfaces:**
- Extends `ShootDetail` with `inventoryReservations: Array<{ id, itemName, itemCode, itemType, startsOn, endsOn, status, overrideReason }>`.
- Actions use `defineAdminAction({ role: "staff" })` and pass `ctx.user.id` to the domain service.

- [ ] **Step 1: Write failing UI/read tests**

```ts
expect(await getShootDetail(SHOOT_ID)).toMatchObject({
  inventoryReservations: [{ itemName: "Clutch dourada", status: "confirmed" }],
});
await expect(createShootInventoryReservationAction(formData)).resolves.toEqual({ ok: false, error: expect.any(String) });
```

- [ ] **Step 2: Verify failure**

Run: `npx.cmd vitest run tests/app/admin-inventory-reservations.test.tsx --reporter=verbose --maxWorkers=1`  
Expected: FAIL because the detail field, action, and component are absent.

- [ ] **Step 3: Implement focused read/actions/presentation**

Join reservation rows to inventory items in `getShootDetail`, ordered by start date. Render a `DetailSection` titled **Acervo reservado** with item code/name/type/status, period, cancellation status, and exception reason. The form receives the Shoot date as initial interval, accepts item id and dates, and makes the exception checkbox/reason explicit. Revalidate the detail route after create/cancel; expose action-result field errors rather than raw database errors.

- [ ] **Step 4: Verify UI and domain regression**

Run: `npx.cmd vitest run tests/app/admin-inventory-reservations.test.tsx tests/domain/inventory-reservations.test.ts --reporter=verbose --maxWorkers=1`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add domain/shoots/queries.ts app/admin/(protected)/agenda/[id]/inventory-actions.ts components/admin/inventory-reservations.tsx app/admin/(protected)/agenda/[id]/page.tsx tests/app/admin-inventory-reservations.test.tsx
git commit -m "feat: manage shoot inventory reservations"
```

### Task 4: Close and validate SCL-553

**Files:**
- Modify: `docs/TASKS.md`

- [ ] **Step 1: Update task tracking**

Mark SCL-553 DONE with the merged commit; note SCL-554, SCL-555, and SCL-558 are unblocked but remain pending.

- [ ] **Step 2: Final checks**

Run: `npm.cmd run typecheck; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run lint; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npx.cmd vitest run tests/domain/inventory-schema.test.ts tests/db/inventory-reservations-migration.test.ts tests/domain/inventory-reservations.test.ts tests/app/admin-inventory-reservations.test.tsx --reporter=verbose --maxWorkers=1; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run predb:migrate`  
Expected: every command exits 0.

- [ ] **Step 3: Commit**

```bash
git add docs/TASKS.md
git commit -m "docs: complete SCL-553"
```
