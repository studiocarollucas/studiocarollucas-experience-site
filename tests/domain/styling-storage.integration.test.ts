import { randomUUID } from "node:crypto";
import { Blob as NodeBlob } from "node:buffer";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { clients, experiencePackages, profiles, shoots, stylingReferences } from "@/db/schema";
import {
  deleteStylingReference,
  uploadStylingReference,
  type StylingMutationClient,
} from "@/domain/styling/client";
import { readStylingReferences } from "@/domain/styling/read";
import { STYLING_BUCKET } from "@/domain/styling/schema";
import { assertAuthUserAbsent } from "../support/live-auth-cleanup";

const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("styling client operations (live Storage/RLS integration)", () => {
  const runId = randomUUID();
  const password = `Scl305-ui-${randomUUID()}!Aa1`;
  const firstAuthUserId = randomUUID();
  const secondAuthUserId = randomUUID();
  const firstClientId = randomUUID();
  const secondClientId = randomUUID();
  const firstShootId = randomUUID();
  const secondShootId = randomUUID();
  const limitShootId = randomUUID();
  const authUserIds = [firstAuthUserId, secondAuthUserId];
  const clientIds = [firstClientId, secondClientId];
  const shootIds = [firstShootId, secondShootId, limitShootId];
  const firstEmail = `scl305-ui-a-${runId}@example.com`;
  const secondEmail = `scl305-ui-b-${runId}@example.com`;
  const objectPaths = new Set<string>();
  let admin: SupabaseClient | undefined;
  let firstSupabase!: SupabaseClient;
  let secondSupabase!: SupabaseClient;

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
    admin = createClient(url, serviceRoleKey, authOptions(`scl305-ui-admin-${runId}`));
    firstSupabase = createClient(url, anonKey, authOptions(`scl305-ui-a-${runId}`));
    secondSupabase = createClient(url, anonKey, authOptions(`scl305-ui-b-${runId}`));

    for (const [id, email] of [
      [firstAuthUserId, firstEmail],
      [secondAuthUserId, secondEmail],
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

    const [experience] = await db
      .select({ id: experiencePackages.id })
      .from(experiencePackages)
      .limit(1);
    if (!experience) throw new Error("A seeded experience package is required");

    await db.insert(clients).values([
      {
        id: firstClientId,
        authUserId: firstAuthUserId,
        name: `Teste SCL-305 UI A ${runId}`,
      },
      {
        id: secondClientId,
        authUserId: secondAuthUserId,
        name: `Teste SCL-305 UI B ${runId}`,
      },
    ]);
    await db.insert(shoots).values([
      {
        id: firstShootId,
        clientId: firstClientId,
        experiencePackageId: experience.id,
        shootDate: "2031-02-10",
        status: "preparacao",
        agreedPrice: "1000.00",
        portalEnabled: true,
      },
      {
        id: secondShootId,
        clientId: secondClientId,
        experiencePackageId: experience.id,
        shootDate: "2031-02-11",
        status: "preparacao",
        agreedPrice: "1200.00",
        portalEnabled: true,
      },
      {
        id: limitShootId,
        clientId: firstClientId,
        experiencePackageId: experience.id,
        shootDate: "2031-02-12",
        status: "preparacao",
        agreedPrice: "1400.00",
        portalEnabled: true,
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
    const cleanupAdmin = admin;

    if (cleanupAdmin && objectPaths.size > 0) {
      await attempt("storage.objects", async () => {
        const removed = await cleanupAdmin.storage.from(STYLING_BUCKET).remove([...objectPaths]);
        if (removed.error) throw removed.error;
      });
    }
    await attempt("styling_references", async () => {
      await db.delete(stylingReferences).where(inArray(stylingReferences.shootId, shootIds));
    });
    await attempt("shoots", async () => {
      await db.delete(shoots).where(inArray(shoots.id, shootIds));
    });
    await attempt("clients", async () => {
      await db.delete(clients).where(inArray(clients.id, clientIds));
    });

    if (cleanupAdmin) {
      for (const authUserId of authUserIds) {
        await attempt(`auth.users:${authUserId}`, async () => {
          const result = await cleanupAdmin.auth.admin.deleteUser(authUserId);
          if (result.error) assertAuthUserAbsent(authUserId, result);
        });
      }
    }

    await attempt("verify rows", async () => {
      expect(
        await db
          .select({ id: stylingReferences.id })
          .from(stylingReferences)
          .where(inArray(stylingReferences.shootId, shootIds))
      ).toEqual([]);
    });
    await attempt("verify shoots", async () => {
      expect(
        await db.select({ id: shoots.id }).from(shoots).where(inArray(shoots.id, shootIds))
      ).toEqual([]);
    });
    await attempt("verify clients", async () => {
      expect(
        await db.select({ id: clients.id }).from(clients).where(inArray(clients.id, clientIds))
      ).toEqual([]);
    });
    await attempt("verify profiles", async () => {
      expect(
        await db.select({ id: profiles.id }).from(profiles).where(inArray(profiles.id, authUserIds))
      ).toEqual([]);
    });

    if (cleanupAdmin) {
      for (const authUserId of authUserIds) {
        await attempt(`verify storage prefix:${authUserId}`, async () => {
          const listed = await cleanupAdmin.storage.from(STYLING_BUCKET).list(authUserId, {
            limit: 100,
          });
          if (listed.error) throw listed.error;
          expect(listed.data).toEqual([]);
        });
        await attempt(`verify auth.users:${authUserId}`, async () => {
          assertAuthUserAbsent(authUserId, await cleanupAdmin.auth.admin.getUserById(authUserId));
        });
      }
    }

    if (cleanupErrors.length) {
      throw new AggregateError(cleanupErrors, "Live styling UI fixture cleanup was incomplete");
    }
  }, 60_000);

  it("uses the real client functions for private upload, signed read, isolation, and owner delete", async () => {
    const uploaded = await uploadStylingReference(
      firstSupabase as unknown as StylingMutationClient,
      {
        file: new NodeBlob([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00])], {
          type: "image/webp",
        }) as unknown as File,
        shootId: firstShootId,
        authUserId: firstAuthUserId,
        caption: "  Referência live  ",
        origin: "client",
        currentCount: 0,
      }
    );
    objectPaths.add(uploaded.storage_path);
    expect(uploaded.storage_path).toMatch(
      new RegExp(`^${firstAuthUserId}/${firstShootId}/[0-9a-f-]{36}\\.webp$`, "i")
    );
    expect(uploaded.storage_path).not.toContain("nome-ignorado");
    expect(uploaded.caption).toBe("Referência live");

    const signed = await readStylingReferences(firstSupabase, firstShootId);
    expect(signed).toHaveLength(1);
    expect(signed[0]).toMatchObject({
      id: uploaded.id,
      storagePath: uploaded.storage_path,
      origin: "client",
      uploadedByAuthUserId: firstAuthUserId,
    });
    expect(signed[0]?.signedUrl).toContain("token=");

    const otherClientRows = await secondSupabase
      .from("styling_references")
      .select("id")
      .eq("shoot_id", firstShootId);
    expect(otherClientRows.error).toBeNull();
    expect(otherClientRows.data).toEqual([]);

    await expect(
      deleteStylingReference(secondSupabase as unknown as StylingMutationClient, uploaded.id)
    ).rejects.toThrow("Não foi possível remover esta referência.");
    const ownerStillReadsObject = await firstSupabase.storage
      .from(STYLING_BUCKET)
      .download(uploaded.storage_path);
    expect(ownerStillReadsObject.error).toBeNull();

    await deleteStylingReference(firstSupabase as unknown as StylingMutationClient, uploaded.id);
    expect(await readStylingReferences(firstSupabase, firstShootId)).toEqual([]);
    if (!admin) throw new Error("Admin fixture is unavailable");
    const deletedExists = await admin.storage.from(STYLING_BUCKET).exists(uploaded.storage_path);
    expect(deletedExists.data).toBe(false);
    const deletedObject = await admin.storage.from(STYLING_BUCKET).download(uploaded.storage_path);
    expect(deletedObject.error).not.toBeNull();
  }, 60_000);

  it("keeps the database authoritative when a 21st reference is attempted", async () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      id: randomUUID(),
      shootId: limitShootId,
      storagePath: `${firstAuthUserId}/${limitShootId}/${runId}-${index}.webp`,
      caption: `Limite ${index + 1}`,
      origin: "client" as const,
      uploadedByAuthUserId: firstAuthUserId,
    }));
    await db.insert(stylingReferences).values(rows);

    let violation: unknown;
    try {
      await db.insert(stylingReferences).values({
        id: randomUUID(),
        shootId: limitShootId,
        storagePath: `${firstAuthUserId}/${limitShootId}/${runId}-21.webp`,
        caption: "Vigésima primeira",
        origin: "client",
        uploadedByAuthUserId: firstAuthUserId,
      });
    } catch (error) {
      violation = error;
    }

    expect(violation).toMatchObject({ cause: { code: "23514" } });
    expect(
      await db
        .select({ id: stylingReferences.id })
        .from(stylingReferences)
        .where(
          inArray(
            stylingReferences.id,
            rows.map((row) => row.id)
          )
        )
    ).toHaveLength(20);

    if (!admin) throw new Error("Admin fixture is unavailable");
    for (const row of rows) {
      objectPaths.add(row.storagePath);
      const uploaded = await admin.storage
        .from(STYLING_BUCKET)
        .upload(row.storagePath, new Uint8Array([0x52, 0x49, 0x46, 0x46]), {
          contentType: "image/webp",
          upsert: false,
        });
      expect(uploaded.error).toBeNull();
    }
    await db.delete(stylingReferences).where(inArray(stylingReferences.id, rows.map((row) => row.id)));

    const orphanBypass = await firstSupabase.from("styling_references").insert({
      shoot_id: limitShootId,
      storage_path: `${firstAuthUserId}/${limitShootId}/${runId}-orphan-bypass.webp`,
      caption: "Não deve ultrapassar objetos órfãos",
      origin: "client",
      uploaded_by_auth_user_id: firstAuthUserId,
    });
    expect(orphanBypass.error?.code).toBe("23514");

    const orphanPaths = rows.map((row) => row.storagePath);
    const cleared = await admin.storage.from(STYLING_BUCKET).remove(orphanPaths);
    expect(cleared.error).toBeNull();
    orphanPaths.forEach((path) => objectPaths.delete(path));

    const raceRows = Array.from({ length: 19 }, (_, index) => ({
      id: randomUUID(),
      shootId: limitShootId,
      storagePath: `${firstAuthUserId}/${limitShootId}/${runId}-race-${index}.webp`,
      caption: `Concorrência ${index + 1}`,
      origin: "client" as const,
      uploadedByAuthUserId: firstAuthUserId,
    }));
    await db.insert(stylingReferences).values(raceRows);
    for (const row of raceRows) {
      objectPaths.add(row.storagePath);
      const uploaded = await admin.storage
        .from(STYLING_BUCKET)
        .upload(row.storagePath, new Uint8Array([0x52, 0x49, 0x46, 0x46]), {
          contentType: "image/webp",
          upsert: false,
        });
      expect(uploaded.error).toBeNull();
    }

    const reservedPath = `${firstAuthUserId}/${limitShootId}/${runId}-race-reserved.webp`;
    const reservation = await firstSupabase
      .from("styling_references")
      .insert({
        shoot_id: limitShootId,
        storage_path: reservedPath,
        caption: "Reserva concorrente",
        origin: "client",
        uploaded_by_auth_user_id: firstAuthUserId,
      })
      .select("id")
      .single();
    expect(reservation.error).toBeNull();
    if (!reservation.data) throw new Error("Race reservation was not returned");
    const reservedId = reservation.data.id;
    objectPaths.add(reservedPath);

    const newcomerPath = `${firstAuthUserId}/${limitShootId}/${runId}-race-new.webp`;
    const [racingUpload, racingDelete, racingInsert] = await Promise.all([
      firstSupabase.storage
        .from(STYLING_BUCKET)
        .upload(reservedPath, new Uint8Array([0x52, 0x49, 0x46, 0x46]), {
          contentType: "image/webp",
          upsert: false,
        }),
      firstSupabase.from("styling_references").delete().eq("id", reservedId),
      firstSupabase.from("styling_references").insert({
        shoot_id: limitShootId,
        storage_path: newcomerPath,
        caption: "Nova reserva concorrente",
        origin: "client",
        uploaded_by_auth_user_id: firstAuthUserId,
      }),
    ]);
    expect([racingUpload.error, racingDelete.error, racingInsert.error].filter(Boolean).length).toBeGreaterThanOrEqual(1);

    const occupancy = await db.execute(sql`
      select count(*)::int as count
      from (
        select storage_path as path
        from public.styling_references
        where shoot_id = ${limitShootId}::uuid
        union
        select name as path
        from storage.objects
        where bucket_id = ${STYLING_BUCKET}
          and split_part(name, '/', 2) = ${limitShootId}
      ) occupied
    `);
    expect(Number(occupancy[0]?.count)).toBeLessThanOrEqual(20);
  }, 60_000);
});
