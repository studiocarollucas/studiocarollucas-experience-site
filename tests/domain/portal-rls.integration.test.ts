import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import {
  clients,
  experiencePackages,
  payments,
  preparationTasks,
  productionJobs,
  shoots,
} from "@/db/schema";
import { readPortalSnapshot } from "@/domain/portal/read";

const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("readPortalSnapshot (live RLS integration)", () => {
  const runId = randomUUID();
  const password = `Scl302-${randomUUID()}!Aa1`;
  const firstClientId = randomUUID();
  const secondClientId = randomUUID();
  const firstShootId = randomUUID();
  const secondShootId = randomUUID();
  const shootIds = [firstShootId, secondShootId];
  const clientIds = [firstClientId, secondClientId];
  const authUserIds: string[] = [];
  let admin: SupabaseClient | undefined;
  let firstSupabase: SupabaseClient;
  let secondSupabase: SupabaseClient;

  beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceRoleKey) {
      throw new Error("Live Supabase environment is incomplete");
    }

    const authOptions = (storageKey: string) => ({
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
        storageKey,
      },
    });
    admin = createClient(url, serviceRoleKey, authOptions(`scl302-admin-${runId}`));
    firstSupabase = createClient(url, anonKey, authOptions(`scl302-a-${runId}`));
    secondSupabase = createClient(url, anonKey, authOptions(`scl302-b-${runId}`));

    const firstEmail = `scl302-a-${runId}@example.com`;
    const secondEmail = `scl302-b-${runId}@example.com`;
    for (const email of [firstEmail, secondEmail]) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) throw error ?? new Error("Auth fixture was not created");
      authUserIds.push(data.user.id);
    }

    const [experience] = await db
      .select({ id: experiencePackages.id })
      .from(experiencePackages)
      .limit(1);
    if (!experience) throw new Error("A seeded experience package is required");

    await db.insert(clients).values([
      {
        id: firstClientId,
        authUserId: authUserIds[0],
        name: `Teste Epic3 SCL-302 A ${runId}`,
      },
      {
        id: secondClientId,
        authUserId: authUserIds[1],
        name: `Teste Epic3 SCL-302 B ${runId}`,
      },
    ]);
    await db.insert(shoots).values([
      {
        id: firstShootId,
        clientId: firstClientId,
        experiencePackageId: experience.id,
        shootDate: "2030-12-10",
        status: "preparacao",
        agreedPrice: "1000.00",
        portalEnabled: true,
      },
      {
        id: secondShootId,
        clientId: secondClientId,
        experiencePackageId: experience.id,
        shootDate: "2030-12-11",
        status: "preparacao",
        agreedPrice: "1200.00",
        portalEnabled: true,
      },
    ]);
    await db.insert(payments).values([
      {
        id: randomUUID(),
        shootId: firstShootId,
        amount: "250.00",
        status: "confirmado",
        paidAt: "2030-01-01T12:00:00Z",
      },
      {
        id: randomUUID(),
        shootId: firstShootId,
        amount: "125.00",
        status: "pendente",
        paidAt: "2030-01-02T12:00:00Z",
      },
      {
        id: randomUUID(),
        shootId: secondShootId,
        amount: "300.00",
        status: "confirmado",
        paidAt: "2030-01-03T12:00:00Z",
      },
    ]);
    await db.insert(preparationTasks).values([
      {
        id: randomUUID(),
        shootId: firstShootId,
        type: "figurino",
        title: "Tarefa visível A",
        visibleToClient: true,
        clientActionable: true,
      },
      {
        id: randomUUID(),
        shootId: firstShootId,
        type: "interno",
        title: "Tarefa oculta A",
        visibleToClient: false,
        clientActionable: false,
      },
      {
        id: randomUUID(),
        shootId: secondShootId,
        type: "moodboard",
        title: "Tarefa visível B",
        visibleToClient: true,
        clientActionable: true,
      },
    ]);

    for (const [supabase, email] of [
      [firstSupabase, firstEmail],
      [secondSupabase, secondEmail],
    ] as const) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  }, 60_000);

  afterAll(async () => {
    const cleanupErrors: unknown[] = [];
    const attempt = async (label: string, cleanup: () => Promise<void>) => {
      try {
        await cleanup();
      } catch (error) {
        cleanupErrors.push(new Error(`Cleanup failed: ${label}`, { cause: error }));
      }
    };

    if (shootIds.length) {
      await attempt("preparation_tasks", async () => {
        await db.delete(preparationTasks).where(inArray(preparationTasks.shootId, shootIds));
      });
      await attempt("payments", async () => {
        await db.delete(payments).where(inArray(payments.shootId, shootIds));
      });
      await attempt("production_jobs", async () => {
        await db.delete(productionJobs).where(inArray(productionJobs.shootId, shootIds));
      });
      await attempt("shoots", async () => {
        await db.delete(shoots).where(inArray(shoots.id, shootIds));
      });
    }
    if (clientIds.length) {
      await attempt("clients", async () => {
        await db.delete(clients).where(inArray(clients.id, clientIds));
      });
    }
    const cleanupAdmin = admin;
    if (cleanupAdmin) {
      for (const authUserId of authUserIds) {
        if (!authUserId) continue;
        await attempt(`auth.users:${authUserId}`, async () => {
          const { error } = await cleanupAdmin.auth.admin.deleteUser(authUserId);
          if (error) throw error;
        });
      }
    }

    if (shootIds.length) {
      await attempt("verify preparation_tasks", async () => {
        expect(
          await db
            .select({ id: preparationTasks.id })
            .from(preparationTasks)
            .where(inArray(preparationTasks.shootId, shootIds)),
        ).toEqual([]);
      });
      await attempt("verify payments", async () => {
        expect(
          await db
            .select({ id: payments.id })
            .from(payments)
            .where(inArray(payments.shootId, shootIds)),
        ).toEqual([]);
      });
      await attempt("verify production_jobs", async () => {
        expect(
          await db
            .select({ id: productionJobs.id })
            .from(productionJobs)
            .where(inArray(productionJobs.shootId, shootIds)),
        ).toEqual([]);
      });
      await attempt("verify shoots", async () => {
        expect(
          await db.select({ id: shoots.id }).from(shoots).where(inArray(shoots.id, shootIds)),
        ).toEqual([]);
      });
    }
    if (clientIds.length) {
      await attempt("verify clients", async () => {
        expect(
          await db.select({ id: clients.id }).from(clients).where(inArray(clients.id, clientIds)),
        ).toEqual([]);
      });
    }
    if (cleanupAdmin) {
      for (const authUserId of authUserIds) {
        if (!authUserId) continue;
        await attempt(`verify auth.users:${authUserId}`, async () => {
          const { data, error } = await cleanupAdmin.auth.admin.getUserById(authUserId);
          expect(data.user).toBeNull();
          expect(error).not.toBeNull();
        });
      }
    }

    if (cleanupErrors.length) {
      throw new AggregateError(cleanupErrors, "Live fixture cleanup was incomplete");
    }
  }, 60_000);

  it("composes only each authenticated client's visible portal data", async () => {
    const now = new Date("2030-01-01T12:00:00-04:00");
    const [firstSnapshot, secondSnapshot] = await Promise.all([
      readPortalSnapshot(firstSupabase, now),
      readPortalSnapshot(secondSupabase, now),
    ]);

    expect(firstSnapshot.client.id).toBe(firstClientId);
    expect(firstSnapshot.shoot?.id).toBe(firstShootId);
    expect(firstSnapshot.payments.map((row) => row.amount)).toEqual(["250.00"]);
    expect(firstSnapshot.tasks.map((row) => row.title)).toEqual(["Tarefa visível A"]);
    expect(secondSnapshot.client.id).toBe(secondClientId);
    expect(secondSnapshot.shoot?.id).toBe(secondShootId);

    const guessed = await firstSupabase.from("shoots").select("id").eq("id", secondShootId);
    expect(guessed.error).toBeNull();
    expect(guessed.data).toEqual([]);
  }, 30_000);

  it("leaves no cross-client shortcut through an explicit client filter", async () => {
    const result = await firstSupabase.from("clients").select("id").eq("id", secondClientId);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});
