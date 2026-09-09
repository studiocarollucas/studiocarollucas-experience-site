# Inventory foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one secure, typed source of truth for physical studio inventory that can later serve Shoot reservations and paid rental orders.

**Architecture:** `inventory_items` stores shared lifecycle fields for outfits, clutches, accessories and props. The table deliberately has no reservation or public checkout fields yet; future `inventory_reservations` will reference it with `shoot` or `rental` purpose, and future `rental_orders` will own payments rather than individual items.

**Tech Stack:** TypeScript, Drizzle/Postgres, Zod, Vitest.

## Global Constraints

- Initial item types are exactly `outfit`, `clutch`, `accessory`, `prop`.
- Every item has unique code, name, optional description/color/size/internal price, operational status and active state.
- RLS, grants and policies allow only staff/admin database access.
- Items are not publicly readable or directly reservable in this task.
- Do not build media, CRUD UI, reservations, `RentalOrder`, checkout, gateway or public catalog.

---

### Task 1: Inventory schema, migration and domain contract

**Files:**
- Create: `db/schema/inventory.ts`, `domain/inventory/schema.ts`, `tests/domain/inventory-schema.test.ts`
- Modify: `db/schema/index.ts`, `db/migrations/0038_inventory_foundation.sql`, `db/migrations/meta/_journal.json`, generated `db/migrations/meta/0038_snapshot.json`

**Interfaces:**
- Produces `inventoryItemTypeValues`, `inventoryItemStatusValues`, `inventoryItems`, `createInventoryItemSchema` and `InventoryItem`.

- [ ] **Step 1: Write failing tests**

```ts
it("exports the four initial item types and validates a physical item", () => {
  expect(inventoryItemTypeValues).toEqual(["outfit", "clutch", "accessory", "prop"]);
  expect(createInventoryItemSchema.safeParse({ code: "CL-001", name: "Clutch dourada", type: "clutch", status: "available" }).success).toBe(true);
});
it("rejects an empty code, unknown type and invalid internal price", () => {
  expect(createInventoryItemSchema.safeParse({ code: "", name: "x", type: "clutch", status: "available" }).success).toBe(false);
  expect(createInventoryItemSchema.safeParse({ code: "X", name: "x", type: "shoe", status: "available" }).success).toBe(false);
  expect(createInventoryItemSchema.safeParse({ code: "X", name: "x", type: "clutch", status: "available", internalPrice: "bad" }).success).toBe(false);
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/domain/inventory-schema.test.ts --reporter=verbose --maxWorkers=1`  
Expected: FAIL because the inventory schema/modules do not exist.

- [ ] **Step 3: Implement minimal schema and migration**

```ts
export const inventoryItemTypeValues = ["outfit", "clutch", "accessory", "prop"] as const;
export const inventoryItemStatusValues = ["available", "maintenance", "retired"] as const;
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: inventoryItemTypeEnum("type").notNull(),
  color: text("color"), size: text("size"),
  status: inventoryItemStatusEnum("status").notNull().default("available"),
  active: boolean("active").notNull().default(true),
  internalPrice: numeric("internal_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Generate migration after `0037`; enable RLS, revoke anon/authenticated defaults, grant authenticated table privileges and create a staff/admin policy using `public.is_staff_or_admin()`.

- [ ] **Step 4: Run GREEN and gates**

Run: `npx vitest run tests/domain/inventory-schema.test.ts --reporter=verbose --maxWorkers=1; npm run predb:migrate; npm run typecheck`  
Expected: tests, migration gate and typecheck pass.

- [ ] **Step 5: Commit**

```bash
git add db domain/inventory tests/domain/inventory-schema.test.ts
git commit -m "feat: add inventory item foundation"
```
