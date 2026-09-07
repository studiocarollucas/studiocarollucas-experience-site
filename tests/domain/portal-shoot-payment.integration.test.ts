import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
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
import { registerPayment } from "@/domain/payments/register-payment";
import { readPortalSnapshot } from "@/domain/portal/read";
import { summarizePortalMoney } from "@/domain/portal/summary";
import { createConfirmedShoot } from "@/domain/shoots/create-confirmed-shoot";
import { assertAuthUserAbsent } from "../support/live-auth-cleanup";

const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("portal Shoot+Payment composition (live integration)", () => {
  const runId = randomUUID();
  const authUserId = randomUUID();
  const clientId = randomUUID();
  const email = `scl304-${runId}@example.com`;
  const password = `Scl304-${randomUUID()}!Aa1`;
  let admin: SupabaseClient | undefined;
  let portal: SupabaseClient;
  let shootId: string | undefined;

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
    admin = createClient(url, serviceRoleKey, authOptions(`scl304-admin-${runId}`));
    portal = createClient(url, anonKey, authOptions(`scl304-client-${runId}`));

    const createdAuth = await admin.auth.admin.createUser({
      id: authUserId,
      email,
      password,
      email_confirm: true,
    });
    if (createdAuth.error || !createdAuth.data.user) {
      throw createdAuth.error ?? new Error("Auth fixture was not created");
    }
    if (createdAuth.data.user.id !== authUserId) {
      throw new Error("Auth fixture did not preserve its preallocated ID");
    }

    const [experience] = await db
      .select({ id: experiencePackages.id })
      .from(experiencePackages)
      .limit(1);
    if (!experience) throw new Error("A seeded experience package is required");

    await db.insert(clients).values({
      id: clientId,
      authUserId,
      name: `Teste Epic3 SCL-304 ${runId}`,
      email,
    });

    const created = await createConfirmedShoot(
      {
        clientId,
        experiencePackageId: experience.id,
        shootDate: "2035-12-10",
        status: "preparacao",
        agreedPrice: "1000.00",
        portalEnabled: true,
      },
      { portalEnabled: true },
    );
    shootId = created.shoot.id;

    await registerPayment({
      shootId,
      amount: "250.00",
      paidAt: "2035-01-01T12:00:00-04:00",
      status: "confirmado",
    });
    await registerPayment({
      shootId,
      amount: "100.00",
      paidAt: "2035-01-02T12:00:00-04:00",
      status: "pendente",
    });

    const signedIn = await portal.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
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

    const createdShootId = shootId;
    if (createdShootId) {
      await attempt("payments", async () => {
        await db.delete(payments).where(eq(payments.shootId, createdShootId));
      });
      await attempt("preparation_tasks", async () => {
        await db.delete(preparationTasks).where(eq(preparationTasks.shootId, createdShootId));
      });
      await attempt("production_jobs", async () => {
        await db.delete(productionJobs).where(eq(productionJobs.shootId, createdShootId));
      });
      await attempt("shoot", async () => {
        await db.delete(shoots).where(eq(shoots.id, createdShootId));
      });
    }
    await attempt("client", async () => {
      await db.delete(clients).where(eq(clients.id, clientId));
    });

    const cleanupAdmin = admin;
    if (cleanupAdmin) {
      await attempt("auth user", async () => {
        const result = await cleanupAdmin.auth.admin.deleteUser(authUserId);
        if (result.error) assertAuthUserAbsent(authUserId, result);
      });
    }

    if (createdShootId) {
      await attempt("verify payments", async () => {
        expect(
          await db.select({ id: payments.id }).from(payments).where(eq(payments.shootId, createdShootId)),
        ).toEqual([]);
      });
      await attempt("verify preparation_tasks", async () => {
        expect(
          await db
            .select({ id: preparationTasks.id })
            .from(preparationTasks)
            .where(eq(preparationTasks.shootId, createdShootId)),
        ).toEqual([]);
      });
      await attempt("verify production_jobs", async () => {
        expect(
          await db
            .select({ id: productionJobs.id })
            .from(productionJobs)
            .where(eq(productionJobs.shootId, createdShootId)),
        ).toEqual([]);
      });
      await attempt("verify shoot", async () => {
        expect(
          await db.select({ id: shoots.id }).from(shoots).where(eq(shoots.id, createdShootId)),
        ).toEqual([]);
      });
    }
    await attempt("verify client", async () => {
      expect(
        await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)),
      ).toEqual([]);
    });
    if (cleanupAdmin) {
      await attempt("verify auth user", async () => {
        assertAuthUserAbsent(authUserId, await cleanupAdmin.auth.admin.getUserById(authUserId));
      });
    }

    if (cleanupErrors.length) {
      throw new AggregateError(cleanupErrors, "Live fixture cleanup was incomplete");
    }
  }, 60_000);

  it("returns only confirmed payments through the authenticated portal read model", async () => {
    const createdShootId = shootId;
    if (!createdShootId) throw new Error("Shoot fixture was not created");

    const snapshot = await readPortalSnapshot(
      portal,
      new Date("2035-01-01T12:00:00-04:00"),
    );

    expect(snapshot.shoot?.id).toBe(createdShootId);
    expect(snapshot.payments.map((payment) => payment.amount)).toEqual(["250.00"]);
    expect(summarizePortalMoney(snapshot.shoot!.agreedPrice, snapshot.payments)).toEqual({
      agreed: "1000.00",
      paid: "250.00",
      balance: "750.00",
      status: "parcial",
    });
  }, 30_000);
});
