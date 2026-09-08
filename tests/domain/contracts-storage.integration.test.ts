import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import {
  clients,
  contracts,
  experiencePackages,
  profiles,
  shoots,
  type ContractSnapshot,
} from "@/db/schema";
import { CONTRACTS_BUCKET } from "@/domain/contracts/snapshot";
import { assertAuthUserAbsent } from "../support/live-auth-cleanup";

const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("contracts private Storage (live RLS integration)", () => {
  const runId = randomUUID();
  const password = `Scl310-${randomUUID()}!Aa1`;
  const staffAuthUserId = randomUUID();
  const clientAuthUserId = randomUUID();
  const clientId = randomUUID();
  const shootId = randomUUID();
  const contractId = randomUUID();
  const deniedContractId = randomUUID();
  const contractPath = `contracts/${contractId}.pdf`;
  const deniedContractPath = `contracts/${deniedContractId}.pdf`;
  const authUserIds = [staffAuthUserId, clientAuthUserId];
  const contractIds = new Set([contractId, deniedContractId]);
  const objectPaths = new Set([contractPath]);
  const staffEmail = `scl310-staff-${runId}@example.com`;
  const clientEmail = `scl310-client-${runId}@example.com`;
  let admin: SupabaseClient | undefined;
  let staffSupabase!: SupabaseClient;
  let clientSupabase!: SupabaseClient;
  let bucketReady = false;

  const snapshot: ContractSnapshot = {
    contractor: { name: "Studio Teste", cpf: "000.000.000-00", address: "Rua Teste, 1" },
    client: {
      name: "Cliente Teste",
      cpf: "111.111.111-11",
      birthday: "2000-01-01",
      address: "Rua Cliente, 2",
      phone: null,
    },
    shoot: {
      date: "2031-03-10",
      startTime: null,
      locationName: null,
      locationAddress: null,
    },
    package: {
      name: "Experiência de teste",
      description: null,
      durationMinutes: 60,
      includedPhotos: 10,
      scenes: null,
    },
    finance: { agreedPrice: "1000.00", confirmedPaid: "0.00", balance: "1000.00" },
    terms: {
      rescheduleFee: "50.00" as const,
      rescheduleWindowDays: 15,
      refundWindowDays: 30,
      imageUsageAuthorized: true,
    },
  };

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
    admin = createClient(url, serviceRoleKey, authOptions(`scl310-admin-${runId}`));
    staffSupabase = createClient(url, anonKey, authOptions(`scl310-staff-${runId}`));
    clientSupabase = createClient(url, anonKey, authOptions(`scl310-client-${runId}`));

    for (const [id, email] of [
      [staffAuthUserId, staffEmail],
      [clientAuthUserId, clientEmail],
    ] as const) {
      const { data, error } = await admin.auth.admin.createUser({
        id,
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) throw error ?? new Error("Auth fixture was not created");
      if (data.user.id !== id) throw new Error("Auth fixture did not preserve its preallocated ID");
    }

    await db.update(profiles).set({ role: "staff" }).where(eq(profiles.id, staffAuthUserId));

    const [experience] = await db
      .select({ id: experiencePackages.id })
      .from(experiencePackages)
      .limit(1);
    if (!experience) throw new Error("A seeded experience package is required");

    await db.insert(clients).values({
      id: clientId,
      authUserId: clientAuthUserId,
      name: `Teste SCL-310 ${runId}`,
      email: clientEmail,
    });
    await db.insert(shoots).values({
      id: shootId,
      clientId,
      experiencePackageId: experience.id,
      shootDate: "2031-03-10",
      status: "preparacao",
      agreedPrice: "1000.00",
      portalEnabled: true,
    });

    await db.insert(contracts).values({
      id: contractId,
      contractNumber: `SCL-310-${runId}`,
      shootId,
      clientId,
      templateVersion: "1.0",
      issuedByAuthUserId: staffAuthUserId,
      imageUsageAuthorized: true,
      snapshot,
      pdfStoragePath: contractPath,
    });

    if (!admin) throw new Error("Admin fixture is unavailable");
    const bucket = await admin.storage.getBucket(CONTRACTS_BUCKET);
    bucketReady = bucket.error === null;
    if (bucket.error) throw bucket.error;
    expect(bucket.data).toMatchObject({ id: CONTRACTS_BUCKET, public: false });

    const uploaded = await admin.storage
      .from(CONTRACTS_BUCKET)
      .upload(contractPath, new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploaded.error) throw uploaded.error;

    for (const [supabase, email] of [
      [staffSupabase, staffEmail],
      [clientSupabase, clientEmail],
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
    const cleanupAdmin = admin;
    let cleanupBucketReady = bucketReady;

    if (cleanupAdmin && !cleanupBucketReady) {
      await attempt("rediscover storage bucket", async () => {
        const bucket = await cleanupAdmin.storage.getBucket(CONTRACTS_BUCKET);
        if (bucket.error) {
          if (bucket.error.message === "Bucket not found") return;
          throw bucket.error;
        }
        cleanupBucketReady = true;
      });
    }
    if (cleanupAdmin && cleanupBucketReady && objectPaths.size > 0) {
      await attempt("storage.objects", async () => {
        const result = await cleanupAdmin.storage.from(CONTRACTS_BUCKET).remove([...objectPaths]);
        if (result.error) throw result.error;
      });
    }
    if (contractIds.size > 0) {
      await attempt("contracts", async () => {
        await db.delete(contracts).where(inArray(contracts.id, [...contractIds]));
      });
    }
    await attempt("shoot", async () => {
      await db.delete(shoots).where(eq(shoots.id, shootId));
    });
    await attempt("client", async () => {
      await db.delete(clients).where(eq(clients.id, clientId));
    });
    if (cleanupAdmin) {
      for (const authUserId of authUserIds) {
        await attempt(`auth.users:${authUserId}`, async () => {
          const result = await cleanupAdmin.auth.admin.deleteUser(authUserId);
          if (result.error) assertAuthUserAbsent(authUserId, result);
        });
      }
    }

    await attempt("verify contracts", async () => {
      expect(
        await db
          .select({ id: contracts.id })
          .from(contracts)
          .where(inArray(contracts.id, [...contractIds])),
      ).toEqual([]);
    });
    await attempt("verify shoot", async () => {
      expect(await db.select({ id: shoots.id }).from(shoots).where(eq(shoots.id, shootId))).toEqual([]);
    });
    await attempt("verify client", async () => {
      expect(await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId))).toEqual([]);
    });
    await attempt("verify profiles", async () => {
      expect(
        await db.select({ id: profiles.id }).from(profiles).where(inArray(profiles.id, authUserIds)),
      ).toEqual([]);
    });
    if (cleanupAdmin && cleanupBucketReady) {
      await attempt("verify storage prefix:contracts", async () => {
        const result = await cleanupAdmin.storage.from(CONTRACTS_BUCKET).list("contracts", { limit: 100 });
        if (result.error) throw result.error;
        expect(
          result.data?.some((object) => [`${contractId}.pdf`, `${deniedContractId}.pdf`].includes(object.name)),
        ).toBe(false);
      });
    }
    if (cleanupAdmin) {
      for (const authUserId of authUserIds) {
        await attempt(`verify auth.users:${authUserId}`, async () => {
          assertAuthUserAbsent(authUserId, await cleanupAdmin.auth.admin.getUserById(authUserId));
        });
      }
    }

    if (cleanupErrors.length) {
      throw new AggregateError(cleanupErrors, "Live contracts fixture cleanup was incomplete");
    }
  }, 60_000);

  it("lets staff sign a PDF but denies the portal client", async () => {
    const [clientRead, staffRead] = await Promise.all([
      clientSupabase.from("contracts").select("id").eq("id", contractId),
      staffSupabase.from("contracts").select("id").eq("id", contractId),
    ]);
    expect(clientRead.error).toBeNull();
    expect(clientRead.data).toEqual([]);
    expect(staffRead.error).toBeNull();
    expect(staffRead.data).toEqual([{ id: contractId }]);

    const clientInsert = await clientSupabase.from("contracts").insert({
      id: deniedContractId,
      contract_number: `SCL-310-denied-${runId}`,
      shoot_id: shootId,
      client_id: clientId,
      template_version: "1.0",
      issued_by_auth_user_id: staffAuthUserId,
      image_usage_authorized: true,
      snapshot,
      pdf_storage_path: deniedContractPath,
    });
    expect(clientInsert.error).not.toBeNull();

    const clientDownload = await clientSupabase.storage.from(CONTRACTS_BUCKET).download(contractPath);
    expect(clientDownload.data).toBeNull();
    expect(clientDownload.error).not.toBeNull();

    const signed = await staffSupabase.storage.from(CONTRACTS_BUCKET).createSignedUrl(contractPath, 60);
    expect(signed.error).toBeNull();
    expect(signed.data?.signedUrl).toContain("token=");
  }, 60_000);
});
