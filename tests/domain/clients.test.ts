import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { createClientSchema } from "@/domain/clients/schema";
import { getClientById, createClient } from "@/domain/clients/service";

describe("createClientSchema", () => {
  it("accepts a client with just a name", () => {
    const result = createClientSchema.safeParse({ name: "Maria Silva" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createClientSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email when provided", () => {
    const result = createClientSchema.safeParse({ name: "Maria Silva", email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid email when provided", () => {
    const result = createClientSchema.safeParse({ name: "Maria Silva", email: "maria@example.com" });
    expect(result.success).toBe(true);
  });

  it("defaults marketingConsent to false", () => {
    const result = createClientSchema.parse({ name: "Maria Silva" });
    expect(result.marketingConsent).toBe(false);
  });

  it("accepts a valid ISO birthday", () => {
    const result = createClientSchema.safeParse({ name: "Maria Silva", birthday: "1994-03-12" });
    expect(result.success).toBe(true);
  });

  // `clients.birthday` is a Postgres `date` column — Zod must reject a malformed
  // value before the insert, not let it surface as a raw Postgres error.
  it("rejects a malformed birthday", () => {
    expect(createClientSchema.safeParse({ name: "Maria Silva", birthday: "not-a-date" }).success).toBe(false);
    expect(createClientSchema.safeParse({ name: "Maria Silva", birthday: "12/03/1994" }).success).toBe(false);
  });
});

// Live-DB tests are gated on an explicit, dedicated opt-in — NOT on DATABASE_URL.
// DATABASE_URL is needed for ordinary local development (dev server, db:migrate), so
// gating on it alone silently armed these write/delete tests against whatever
// database .env.local points at — today, the project's only real Supabase project.
// RUN_LIVE_DB_TESTS must be set to the literal "true" as well. See docs/DECISIONS.md
// and .env.example.
const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("createClient / getClientById (integration)", () => {
  afterAll(async () => {
    await db.delete(clients).where(eq(clients.name, "Teste Epic1 SCL-100"));
  });

  it("creates a client and reads it back", async () => {
    const created = await createClient({ name: "Teste Epic1 SCL-100" });
    expect(created.id).toBeDefined();
    expect(created.marketingConsent).toBe(false);

    const fetched = await getClientById(created.id);
    expect(fetched?.name).toBe("Teste Epic1 SCL-100");
  });
});
