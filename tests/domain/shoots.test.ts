import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, shoots, experiencePackages } from "@/db/schema";
import { createShootSchema } from "@/domain/shoots/schema";
import { createShoot } from "@/domain/shoots/service";
import { createClient } from "@/domain/clients/service";

describe("createShootSchema", () => {
  const validBase = {
    clientId: "00000000-0000-4000-8000-000000000001",
    experiencePackageId: "00000000-0000-4000-8000-000000000002",
    shootDate: "2026-12-01",
    agreedPrice: "1200.00",
  };

  it("accepts a minimal valid shoot", () => {
    expect(createShootSchema.safeParse(validBase).success).toBe(true);
  });

  it("defaults status to reserva", () => {
    const parsed = createShootSchema.parse(validBase);
    expect(parsed.status).toBe("reserva");
  });

  // paymentStatus is deliberately not part of this schema — db/schema/shoots.ts
  // documents the column as never user-editable (PRD §7.5: the sum of confirmed
  // Payment rows is the only source of financial truth). Zod strips unknown keys by
  // default, so an attempt to set it is silently dropped rather than honoured.
  it("does not accept a caller-supplied paymentStatus", () => {
    const parsed = createShootSchema.parse({ ...validBase, paymentStatus: "pago" });
    expect(parsed).not.toHaveProperty("paymentStatus");
  });

  it("rejects a malformed shootDate", () => {
    expect(createShootSchema.safeParse({ ...validBase, shootDate: "not-a-date" }).success).toBe(false);
    expect(createShootSchema.safeParse({ ...validBase, shootDate: "2026-13-01" }).success).toBe(false);
  });

  it("accepts a valid startTime and rejects a malformed one", () => {
    expect(createShootSchema.safeParse({ ...validBase, startTime: "14:30" }).success).toBe(true);
    expect(createShootSchema.safeParse({ ...validBase, startTime: "14:30:00" }).success).toBe(true);
    expect(createShootSchema.safeParse({ ...validBase, startTime: "not-a-time" }).success).toBe(false);
    expect(createShootSchema.safeParse({ ...validBase, startTime: "25:00" }).success).toBe(false);
  });

  it("rejects a missing clientId", () => {
    const { clientId, ...rest } = validBase;
    expect(createShootSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an invalid clientId (not a uuid)", () => {
    expect(createShootSchema.safeParse({ ...validBase, clientId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects a missing agreedPrice", () => {
    const { agreedPrice, ...rest } = validBase;
    expect(createShootSchema.safeParse(rest).success).toBe(false);
  });
});

// Live-DB tests are gated on an explicit, dedicated opt-in — NOT on DATABASE_URL,
// which is needed for ordinary local development. See docs/DECISIONS.md and
// .env.example.
const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

// Coverage for the invariant createShootSchema no longer expresses: paymentStatus is
// not a caller-settable field, and a newly created shoot lands on "nao_iniciado"
// because the *Postgres column default* supplies it — not because Zod filled in a
// default. That distinction is the whole point of removing the field from the schema
// (PRD §7.5), so it has to be asserted against the real database.
describeIfLiveDb("createShoot (integration) — payment_status comes from the DB default", () => {
  const TEST_CLIENT_NAME = "Teste Epic1 SCL-103 payment_status";
  let createdShootId: string | undefined;
  let createdClientId: string | undefined;

  afterAll(async () => {
    if (createdShootId) await db.delete(shoots).where(eq(shoots.id, createdShootId));
    if (createdClientId) await db.delete(clients).where(eq(clients.id, createdClientId));
  });

  it("defaults payment_status to nao_iniciado with no paymentStatus supplied", async () => {
    const [pkg] = await db.select().from(experiencePackages).limit(1);
    expect(pkg, "expected the seeded experience_packages catalog to be present").toBeDefined();

    const client = await createClient({ name: TEST_CLIENT_NAME });
    createdClientId = client.id;

    const shoot = await createShoot({
      clientId: client.id,
      experiencePackageId: pkg.id,
      shootDate: "2026-12-01",
      agreedPrice: "1200.00",
    });
    createdShootId = shoot.id;

    expect(shoot.paymentStatus).toBe("nao_iniciado");
  });
});
