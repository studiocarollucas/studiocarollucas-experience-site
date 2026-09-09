# Commercial conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert a won Lead through an explicit Client decision and create one confirmed Shoot/reservation from that conversion.

**Architecture:** A `lead_conversions` row is the idempotency boundary: one Lead can be linked once, while a Client can be the destination of many conversions. Domain services own candidate lookup, conversion, audit and confirmed-shoot creation; protected Admin actions and the Lead detail compose those services.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle/Postgres, Zod, Vitest, React 19 Server Actions.

## Global Constraints

- Only `staff` and `admin` may list candidate Clients, convert Leads, or create the resulting Shoot.
- A Lead must have status `ganho`; email/phone matches require an explicit Admin choice and never auto-link a Client.
- Conversion and its audit entry are atomic and idempotent.
- A confirmed Shoot is created through `createConfirmedShoot`; payment status is never caller supplied.
- No Gallery, SEO, public route, or automation changes belong in this plan.

---

### Task 1: Conversion persistence and domain service

**Files:**
- Create: `db/schema/lead-conversions.ts`, `domain/leads/conversion.ts`, `tests/domain/lead-conversion.test.ts`
- Modify: `db/schema/index.ts`, `db/migrations/0037_lead_conversions.sql`, `db/migrations/meta/_journal.json`, generated snapshot

**Interfaces:**
- Produces `findLeadClientCandidates(leadId): Promise<ClientCandidate[]>` and `convertWonLead({ leadId, actorUserId, client: { mode: "existing"; clientId: string } | { mode: "new" } }): Promise<{ client: Client; conversion: LeadConversion }>`.

- [ ] **Step 1: Write failing tests**

```ts
it("requires an explicit existing-or-new choice for a won Lead", async () => {
  await expect(convertWonLead({ leadId, actorUserId, client: undefined as never })).rejects.toThrow();
});
it("returns the prior conversion without creating a second Client or audit row", async () => {
  await convertWonLead({ leadId, actorUserId, client: { mode: "new" } });
  await expect(convertWonLead({ leadId, actorUserId, client: { mode: "new" } })).resolves.toMatchObject({ client });
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/domain/lead-conversion.test.ts --reporter=verbose --maxWorkers=1`  
Expected: FAIL because the schema and service do not exist.

- [ ] **Step 3: Implement minimal persistence and service**

```ts
export const leadConversions = pgTable("lead_conversions", {
  leadId: uuid("lead_id").primaryKey().references(() => leads.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  convertedByUserId: uuid("converted_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Inside one `db.transaction`, read/lock the Lead, reject non-`ganho`, return an existing conversion when present, create or verify the explicitly chosen Client, insert `lead_conversions`, update `leads.clientId`, and insert a minimal `lead.converted` audit row.

- [ ] **Step 4: Run GREEN and migration gates**

Run: `npx vitest run tests/domain/lead-conversion.test.ts --reporter=verbose --maxWorkers=1; npm run predb:migrate`  
Expected: all focused tests pass and migration validation exits 0.

- [ ] **Step 5: Commit**

```bash
git add db domain/leads tests/domain/lead-conversion.test.ts
git commit -m "feat: convert won leads to clients"
```

### Task 2: Convert a linked Client into a confirmed Shoot

**Files:**
- Create: `domain/leads/converted-shoot.ts`, `tests/domain/lead-converted-shoot.test.ts`

**Interfaces:**
- Consumes `lead_conversions`, `createConfirmedShoot`.
- Produces `createConfirmedShootFromLead({ leadId, actorUserId, shoot: Omit<CreateShootInput, "clientId"> }): Promise<{ shoot: Shoot }>`.

- [ ] **Step 1: Write failing tests**

```ts
it("rejects a Lead without a conversion", async () => {
  await expect(createConfirmedShootFromLead({ leadId, actorUserId, shoot })).rejects.toThrow("Cliente");
});
it("creates one confirmed reservation from the linked Client and audits it", async () => {
  await expect(createConfirmedShootFromLead({ leadId, actorUserId, shoot })).resolves.toMatchObject({ shoot: { clientId } });
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/domain/lead-converted-shoot.test.ts --reporter=verbose --maxWorkers=1`  
Expected: FAIL because the conversion-to-Shoot function does not exist.

- [ ] **Step 3: Implement through the existing reservation lifecycle**

```ts
const conversion = await getLeadConversion(leadId);
if (!conversion) throw new Error("Cliente ainda não foi definido para este Lead.");
const result = await createConfirmedShoot({ ...shoot, clientId: conversion.clientId });
await recordAuditEvent({ actorUserId, action: "lead.shoot_created", entityType: "lead", entityId: leadId, after: { shootId: result.shoot.id } });
return { shoot: result.shoot };
```

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run tests/domain/lead-converted-shoot.test.ts tests/domain/shoots.test.ts --reporter=verbose --maxWorkers=1`  
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add domain/leads tests/domain/lead-converted-shoot.test.ts
git commit -m "feat: create reservations from converted leads"
```

### Task 3: Protected Lead conversion UI and actions

**Files:**
- Modify: `app/admin/(protected)/leads/[id]/actions.ts`, `app/admin/(protected)/leads/[id]/page.tsx`, `components/admin/lead-detail.tsx`
- Create: `components/admin/lead-conversion.tsx`, `tests/app/admin-lead-conversion.test.tsx`

- [ ] **Step 1: Write failing route/action tests**

```ts
it("blocks a client user before candidate lookup", async () => expect(await page()).toEqual(expect.anything()));
it("passes the authenticated actor and selected existing Client to conversion", async () => {
  await convertLeadAction({ leadId, mode: "existing", clientId });
  expect(convertWonLead).toHaveBeenCalledWith(expect.objectContaining({ actorUserId, client: { mode: "existing", clientId } }));
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run tests/app/admin-lead-conversion.test.tsx --reporter=verbose --maxWorkers=1`  
Expected: FAIL because the conversion controls and actions do not exist.

- [ ] **Step 3: Implement protected actions and UI**

```ts
export const convertLeadAction = defineAdminAction({ role: "staff", input: conversionInputSchema }, async (input, user) => {
  const result = await convertWonLead({ ...input, actorUserId: user.id });
  revalidatePath(`/admin/leads/${input.leadId}`);
  return { clientId: result.client.id };
});
```

Render candidate choices and a distinct “Criar novo cliente” confirmation only for `ganho`; after conversion render the existing new-shoot form with `clientId` omitted from user input.

- [ ] **Step 4: Run GREEN and authorization guard**

Run: `npx vitest run tests/app/admin-lead-conversion.test.tsx tests/app/admin-lead-detail-page.test.tsx --reporter=verbose --maxWorkers=1; npm run check:admin-auth`  
Expected: tests and auth guard pass.

- [ ] **Step 5: Commit**

```bash
git add app/admin components/admin tests/app/admin-lead-conversion.test.tsx
git commit -m "feat: add lead conversion controls"
```
