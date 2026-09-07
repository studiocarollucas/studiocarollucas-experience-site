import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import {
  clients,
  experiencePackages,
  profiles,
  shoots,
  stylingReferences,
} from "@/db/schema";
import { STYLING_BUCKET } from "@/domain/styling/schema";
import { assertAuthUserAbsent } from "../support/live-auth-cleanup";

const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("styling references (live RLS and Storage integration)", () => {
  const runId = randomUUID();
  const password = `Scl305-${randomUUID()}!Aa1`;
  const firstAuthUserId = randomUUID();
  const secondAuthUserId = randomUUID();
  const staffAuthUserId = randomUUID();
  const firstClientId = randomUUID();
  const secondClientId = randomUUID();
  const firstShootId = randomUUID();
  const secondShootId = randomUUID();
  const limitShootId = randomUUID();
  const pathShootId = randomUUID();
  const authUserIds = [firstAuthUserId, secondAuthUserId, staffAuthUserId];
  const clientIds = [firstClientId, secondClientId];
  const shootIds = [firstShootId, secondShootId, limitShootId, pathShootId];
  const firstEmail = `scl305-a-${runId}@example.com`;
  const secondEmail = `scl305-b-${runId}@example.com`;
  const staffEmail = `scl305-staff-${runId}@example.com`;
  const firstPath = `${firstAuthUserId}/${firstShootId}/${runId}-a.png`;
  const secondPath = `${secondAuthUserId}/${secondShootId}/${runId}-b.webp`;
  const studioPath = `${staffAuthUserId}/${firstShootId}/${runId}-studio.jpg`;
  const delegatedStudioPath = `${firstAuthUserId}/${firstShootId}/${runId}-studio-assigned.png`;
  const invalidMimePath = `${firstAuthUserId}/${firstShootId}/${runId}-invalid.gif`;
  const wrongPrefixPath = `${secondAuthUserId}/${firstShootId}/${runId}-wrong-prefix.png`;
  const wrongShootPath = `${firstAuthUserId}/${secondShootId}/${runId}-wrong-shoot.png`;
  const malformedPath = `${firstAuthUserId}/not-a-uuid/${runId}.png`;
  const noFilenamePath = `${firstAuthUserId}/${pathShootId}`;
  const emptySegmentPath = `${firstAuthUserId}//${runId}-empty.png`;
  const extraSegmentPath = `${firstAuthUserId}/${pathShootId}/folder/${runId}-extra.png`;
  const dotObjectPath = `${firstAuthUserId}/${pathShootId}/.`;
  const parentObjectPath = `${firstAuthUserId}/${pathShootId}/..`;
  const objectPaths = [
    firstPath,
    secondPath,
    studioPath,
    delegatedStudioPath,
    invalidMimePath,
    wrongPrefixPath,
    wrongShootPath,
    malformedPath,
    noFilenamePath,
    emptySegmentPath,
    extraSegmentPath,
    dotObjectPath,
    parentObjectPath,
  ];
  let admin: SupabaseClient | undefined;
  let firstSupabase!: SupabaseClient;
  let secondSupabase!: SupabaseClient;
  let staffSupabase!: SupabaseClient;
  let bucketReady = false;

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
    admin = createClient(url, serviceRoleKey, authOptions(`scl305-admin-${runId}`));
    firstSupabase = createClient(url, anonKey, authOptions(`scl305-a-${runId}`));
    secondSupabase = createClient(url, anonKey, authOptions(`scl305-b-${runId}`));
    staffSupabase = createClient(url, anonKey, authOptions(`scl305-staff-${runId}`));

    for (const [id, email] of [
      [firstAuthUserId, firstEmail],
      [secondAuthUserId, secondEmail],
      [staffAuthUserId, staffEmail],
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

    await db.insert(clients).values([
      {
        id: firstClientId,
        authUserId: firstAuthUserId,
        name: `Teste Epic3 SCL-305 A ${runId}`,
      },
      {
        id: secondClientId,
        authUserId: secondAuthUserId,
        name: `Teste Epic3 SCL-305 B ${runId}`,
      },
    ]);
    await db.insert(shoots).values([
      {
        id: firstShootId,
        clientId: firstClientId,
        experiencePackageId: experience.id,
        shootDate: "2031-01-10",
        status: "preparacao",
        agreedPrice: "1000.00",
        portalEnabled: true,
      },
      {
        id: secondShootId,
        clientId: secondClientId,
        experiencePackageId: experience.id,
        shootDate: "2031-01-11",
        status: "preparacao",
        agreedPrice: "1200.00",
        portalEnabled: true,
      },
      {
        id: limitShootId,
        clientId: firstClientId,
        experiencePackageId: experience.id,
        shootDate: "2031-01-12",
        status: "preparacao",
        agreedPrice: "1400.00",
        portalEnabled: true,
      },
      {
        id: pathShootId,
        clientId: firstClientId,
        experiencePackageId: experience.id,
        shootDate: "2031-01-13",
        status: "preparacao",
        agreedPrice: "1600.00",
        portalEnabled: true,
      },
    ]);

    for (const [supabase, email] of [
      [firstSupabase, firstEmail],
      [secondSupabase, secondEmail],
      [staffSupabase, staffEmail],
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
        const bucket = await cleanupAdmin.storage.getBucket(STYLING_BUCKET);
        if (bucket.error) {
          if (bucket.error.message === "Bucket not found") return;
          throw bucket.error;
        }
        cleanupBucketReady = true;
      });
    }
    if (cleanupAdmin && cleanupBucketReady) {
      await attempt("storage.objects", async () => {
        const result = await cleanupAdmin.storage.from(STYLING_BUCKET).remove(objectPaths);
        if (result.error) throw result.error;
      });
    }

    await attempt("styling_references", async () => {
      await db
        .delete(stylingReferences)
        .where(inArray(stylingReferences.shootId, shootIds));
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

    await attempt("verify styling_references", async () => {
      expect(
        await db
          .select({ id: stylingReferences.id })
          .from(stylingReferences)
          .where(inArray(stylingReferences.shootId, shootIds)),
      ).toEqual([]);
    });
    await attempt("verify shoots", async () => {
      expect(
        await db.select({ id: shoots.id }).from(shoots).where(inArray(shoots.id, shootIds)),
      ).toEqual([]);
    });
    await attempt("verify clients", async () => {
      expect(
        await db.select({ id: clients.id }).from(clients).where(inArray(clients.id, clientIds)),
      ).toEqual([]);
    });
    await attempt("verify profiles", async () => {
      expect(
        await db.select({ id: profiles.id }).from(profiles).where(inArray(profiles.id, authUserIds)),
      ).toEqual([]);
    });

    if (cleanupAdmin && cleanupBucketReady) {
      for (const authUserId of authUserIds) {
        await attempt(`verify storage prefix:${authUserId}`, async () => {
          const result = await cleanupAdmin.storage.from(STYLING_BUCKET).list(authUserId, {
            limit: 100,
          });
          if (result.error) throw result.error;
          expect(result.data).toEqual([]);
        });
      }
    }
    if (cleanupAdmin) {
      for (const authUserId of authUserIds) {
        await attempt(`verify auth.users:${authUserId}`, async () => {
          assertAuthUserAbsent(
            authUserId,
            await cleanupAdmin.auth.admin.getUserById(authUserId),
          );
        });
      }
    }

    if (cleanupErrors.length) {
      throw new AggregateError(cleanupErrors, "Live fixture cleanup was incomplete");
    }
  }, 60_000);

  it("installs the exact table, policy, helper, and grant contracts", async () => {
    const relation = await db.execute(sql`
      select c.relrowsecurity,
        (
          select count(*)::int
          from information_schema.columns
          where table_schema = 'public' and table_name = 'styling_references'
        ) as column_count
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'styling_references'
    `);
    expect(relation[0]).toMatchObject({ relrowsecurity: true, column_count: 7 });

    const constraints = await db.execute(sql`
      select array_agg(con.conname order by con.conname) as names
      from pg_catalog.pg_constraint con
      join pg_catalog.pg_class c on c.oid = con.conrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'styling_references'
    `);
    expect(constraints[0]?.names).toEqual([
      "styling_references_caption_length",
      "styling_references_pkey",
      "styling_references_shoot_id_fkey",
      "styling_references_storage_path_unique",
      "styling_references_uploaded_by_auth_user_id_fkey",
    ]);

    const indexAndTrigger = await db.execute(sql`
      select
        to_regclass('public.styling_references_shoot_created_idx') is not null as has_index,
        exists (
          select 1
          from pg_catalog.pg_trigger t
          join pg_catalog.pg_class c on c.oid = t.tgrelid
          join pg_catalog.pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname = 'styling_references'
            and t.tgname = 'styling_references_limit'
            and not t.tgisinternal
        ) as has_trigger
    `);
    expect(indexAndTrigger[0]).toMatchObject({ has_index: true, has_trigger: true });

    const policies = await db.execute(sql`
      select schemaname, array_agg(policyname order by policyname) as names
      from pg_catalog.pg_policies
      where (schemaname = 'public' and tablename = 'styling_references')
         or (schemaname = 'storage' and tablename = 'objects'
             and policyname like 'styling_objects_%')
      group by schemaname
      order by schemaname
    `);
    expect(policies).toEqual([
      {
        schemaname: "public",
        names: [
          "styling_references_client_delete",
          "styling_references_client_insert",
          "styling_references_client_read",
          "styling_references_staff_access",
        ],
      },
      {
        schemaname: "storage",
        names: [
          "styling_objects_client_delete",
          "styling_objects_client_insert",
          "styling_objects_client_read",
          "styling_objects_staff_access",
        ],
      },
    ]);

    const hardenedPolicyExpressions = await db.execute(sql`
      select policyname, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
      from pg_catalog.pg_policies
      where policyname in (
        'styling_references_client_insert',
        'styling_references_client_delete',
        'styling_objects_client_read',
        'styling_objects_client_insert',
        'styling_objects_client_delete'
      )
      order by policyname
    `);
    const policyExpressionByName = new Map(
      hardenedPolicyExpressions.map((policy) => [policy.policyname, policy]),
    );
    expect(
      String(policyExpressionByName.get("styling_references_client_insert")?.with_check),
    ).toContain("is_canonical_styling_path(storage_path, auth.uid(), shoot_id)");
    expect(
      String(policyExpressionByName.get("styling_references_client_delete")?.qual),
    ).toContain("origin = 'client'::styling_reference_origin");
    expect(
      String(policyExpressionByName.get("styling_objects_client_insert")?.with_check),
    ).toContain("is_canonical_styling_path(name, auth.uid(), NULL::uuid)");

    const grants = await db.execute(sql`
      select
        has_any_column_privilege(
          'authenticated', 'public.styling_references', 'select'
        ) as authenticated_select,
        has_column_privilege(
          'authenticated', 'public.styling_references', 'shoot_id', 'insert'
        ) as authenticated_insert_shoot,
        has_column_privilege(
          'authenticated', 'public.styling_references', 'id', 'insert'
        ) as authenticated_insert_id,
        has_table_privilege(
          'authenticated', 'public.styling_references', 'delete'
        ) as authenticated_delete,
        has_table_privilege(
          'authenticated', 'public.styling_references', 'update'
        ) as authenticated_update,
        has_any_column_privilege(
          'anon', 'public.styling_references', 'select,insert,update'
        ) as anon_columns,
        has_table_privilege(
          'anon', 'public.styling_references', 'delete'
        ) as anon_delete
    `);
    expect(grants[0]).toEqual({
      authenticated_select: true,
      authenticated_insert_shoot: true,
      authenticated_insert_id: false,
      authenticated_delete: true,
      authenticated_update: false,
      anon_columns: false,
      anon_delete: false,
    });

    const helpers = await db.execute(sql`
      select n.nspname as schema_name, p.proname, p.prosecdef, p.proconfig,
        pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
        pg_catalog.pg_get_functiondef(p.oid) as definition,
        owner.rolbypassrls as owner_bypasses_rls,
        has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
        has_function_privilege('anon', p.oid, 'execute') as anon_execute
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      join pg_catalog.pg_roles owner on owner.oid = p.proowner
      where p.proname in (
        'owns_styling_object',
        'enforce_styling_reference_limit',
        'is_canonical_styling_path'
      )
      order by p.proname
    `);
    expect(helpers).toHaveLength(3);
    expect(helpers[0]).toMatchObject({
      schema_name: "private",
      proname: "enforce_styling_reference_limit",
      prosecdef: true,
      owner_bypasses_rls: true,
      authenticated_execute: false,
      anon_execute: false,
    });
    expect(helpers[1]).toMatchObject({
      schema_name: "private",
      proname: "is_canonical_styling_path",
      prosecdef: false,
      owner_bypasses_rls: true,
      authenticated_execute: true,
      anon_execute: false,
    });
    expect(helpers[1]?.identity_arguments).toBe(
      "object_name text, expected_uploader_id uuid, expected_shoot_id uuid",
    );
    expect(String(helpers[1]?.definition).toLowerCase()).toContain(
      "array_length(path_parts, 1) is distinct from 3",
    );
    expect(helpers[2]).toMatchObject({
      schema_name: "private",
      proname: "owns_styling_object",
      prosecdef: true,
      owner_bypasses_rls: true,
      authenticated_execute: true,
      anon_execute: false,
    });
    expect(String(helpers[2]?.definition)).toContain("is_canonical_styling_path");
    for (const helper of helpers) {
      expect(String(helper.proconfig)).toContain("search_path=");
    }

    const schemaUsage = await db.execute(sql`
      select
        has_schema_privilege('authenticated', 'private', 'usage') as authenticated_usage,
        has_schema_privilege('anon', 'private', 'usage') as anon_usage
    `);
    expect(schemaUsage[0]).toEqual({ authenticated_usage: true, anon_usage: false });
  });

  it("keeps the bucket private and rejects MIME types outside the allowlist", async () => {
    if (!admin) throw new Error("Admin client is unavailable");
    const bucket = await admin.storage.getBucket(STYLING_BUCKET);
    bucketReady = bucket.error === null;
    expect(bucket.error).toBeNull();
    expect(bucket.data).toMatchObject({
      id: STYLING_BUCKET,
      name: STYLING_BUCKET,
      public: false,
      file_size_limit: 8 * 1024 * 1024,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
    });
    const rejected = await firstSupabase.storage
      .from(STYLING_BUCKET)
      .upload(invalidMimePath, new Uint8Array([1, 2, 3]), {
        contentType: "image/gif",
        upsert: false,
      });
    expect(rejected.error).not.toBeNull();
    expect(rejected.data).toBeNull();
  }, 30_000);

  it("rejects non-canonical row and object paths", async () => {
    const invalidPaths = [
      malformedPath,
      noFilenamePath,
      emptySegmentPath,
      extraSegmentPath,
      dotObjectPath,
      parentObjectPath,
    ];
    const storageAttempts = await Promise.all(
      invalidPaths.map((storagePath) =>
        firstSupabase.storage
          .from(STYLING_BUCKET)
          .upload(storagePath, new Uint8Array([1]), { contentType: "image/png" }),
      ),
    );
    expect(storageAttempts).toHaveLength(invalidPaths.length);
    expect(storageAttempts.every((result) => result.error !== null)).toBe(true);

    const rowAttempts = await Promise.all(
      invalidPaths.map((storagePath) =>
        firstSupabase.from("styling_references").insert({
          shoot_id: pathShootId,
          storage_path: storagePath,
          origin: "client",
          uploaded_by_auth_user_id: firstAuthUserId,
        }),
      ),
    );
    expect(rowAttempts).toHaveLength(invalidPaths.length);
    expect(rowAttempts.every((result) => result.error !== null)).toBe(true);
  }, 30_000);

  it("isolates client rows and objects while letting staff manage the board", async () => {
    const firstUpload = await firstSupabase.storage
      .from(STYLING_BUCKET)
      .upload(firstPath, new Uint8Array([1, 2, 3]), {
        contentType: "image/png",
        upsert: false,
      });
    expect(firstUpload.error).toBeNull();

    const secondUpload = await secondSupabase.storage
      .from(STYLING_BUCKET)
      .upload(secondPath, new Uint8Array([4, 5, 6]), {
        contentType: "image/webp",
        upsert: false,
      });
    expect(secondUpload.error).toBeNull();

    const studioUpload = await staffSupabase.storage
      .from(STYLING_BUCKET)
      .upload(studioPath, new Uint8Array([7, 8, 9]), {
        contentType: "image/jpeg",
        upsert: false,
      });
    expect(studioUpload.error).toBeNull();

    for (const deniedUpload of [
      await firstSupabase.storage
        .from(STYLING_BUCKET)
        .upload(wrongPrefixPath, new Uint8Array([1]), { contentType: "image/png" }),
      await firstSupabase.storage
        .from(STYLING_BUCKET)
        .upload(wrongShootPath, new Uint8Array([1]), { contentType: "image/png" }),
      await firstSupabase.storage
        .from(STYLING_BUCKET)
        .upload(malformedPath, new Uint8Array([1]), { contentType: "image/png" }),
    ]) {
      expect(deniedUpload.error).not.toBeNull();
      expect(deniedUpload.data).toBeNull();
    }

    const firstInsert = await firstSupabase
      .from("styling_references")
      .insert({
        shoot_id: firstShootId,
        storage_path: firstPath,
        caption: "Referência da cliente A",
        origin: "client",
        uploaded_by_auth_user_id: firstAuthUserId,
      })
      .select("storage_path")
      .single();
    expect(firstInsert.error).toBeNull();
    expect(firstInsert.data?.storage_path).toBe(firstPath);

    const secondInsert = await secondSupabase
      .from("styling_references")
      .insert({
        shoot_id: secondShootId,
        storage_path: secondPath,
        caption: "Referência da cliente B",
        origin: "client",
        uploaded_by_auth_user_id: secondAuthUserId,
      })
      .select("storage_path")
      .single();
    expect(secondInsert.error).toBeNull();

    const studioInsert = await staffSupabase
      .from("styling_references")
      .insert({
        shoot_id: firstShootId,
        storage_path: studioPath,
        caption: "Referência do estúdio",
        origin: "studio",
        uploaded_by_auth_user_id: staffAuthUserId,
      })
      .select("storage_path")
      .single();
    expect(studioInsert.error).toBeNull();

    const delegatedStudioInsert = await staffSupabase
      .from("styling_references")
      .insert({
        shoot_id: firstShootId,
        storage_path: delegatedStudioPath,
        caption: "Referência studio atribuída à cliente",
        origin: "studio",
        uploaded_by_auth_user_id: firstAuthUserId,
      })
      .select("storage_path")
      .single();
    expect(delegatedStudioInsert.error).toBeNull();

    for (const deniedInsert of [
      await firstSupabase.from("styling_references").insert({
        shoot_id: firstShootId,
        storage_path: `${firstAuthUserId}/${firstShootId}/${runId}-studio-spoof.png`,
        origin: "studio",
        uploaded_by_auth_user_id: firstAuthUserId,
      }),
      await firstSupabase.from("styling_references").insert({
        shoot_id: firstShootId,
        storage_path: `${firstAuthUserId}/${firstShootId}/${runId}-uploader-spoof.png`,
        origin: "client",
        uploaded_by_auth_user_id: secondAuthUserId,
      }),
      await firstSupabase.from("styling_references").insert({
        shoot_id: firstShootId,
        storage_path: `${secondAuthUserId}/${firstShootId}/${runId}-path-spoof.png`,
        origin: "client",
        uploaded_by_auth_user_id: firstAuthUserId,
      }),
      await firstSupabase.from("styling_references").insert({
        shoot_id: secondShootId,
        storage_path: `${firstAuthUserId}/${secondShootId}/${runId}-shoot-spoof.png`,
        origin: "client",
        uploaded_by_auth_user_id: firstAuthUserId,
      }),
    ]) {
      expect(deniedInsert.error).not.toBeNull();
      expect(deniedInsert.data).toBeNull();
    }

    const [firstRows, secondRows, staffRows] = await Promise.all([
      firstSupabase
        .from("styling_references")
        .select("storage_path,origin")
        .order("storage_path"),
      secondSupabase
        .from("styling_references")
        .select("storage_path,origin")
        .order("storage_path"),
      staffSupabase
        .from("styling_references")
        .select("storage_path,origin")
        .order("storage_path"),
    ]);
    expect(firstRows.error).toBeNull();
    expect(firstRows.data?.map((row) => row.storage_path).sort()).toEqual(
      [delegatedStudioPath, firstPath, studioPath].sort(),
    );
    expect(secondRows.error).toBeNull();
    expect(secondRows.data?.map((row) => row.storage_path)).toEqual([secondPath]);
    expect(staffRows.error).toBeNull();
    expect(staffRows.data?.map((row) => row.storage_path).sort()).toEqual(
      [delegatedStudioPath, firstPath, secondPath, studioPath].sort(),
    );

    const [firstDownload, secondDownload, studioDownload, crossDownload] = await Promise.all([
      firstSupabase.storage.from(STYLING_BUCKET).download(firstPath),
      secondSupabase.storage.from(STYLING_BUCKET).download(secondPath),
      firstSupabase.storage.from(STYLING_BUCKET).download(studioPath),
      secondSupabase.storage.from(STYLING_BUCKET).download(firstPath),
    ]);
    expect(firstDownload.error).toBeNull();
    expect(secondDownload.error).toBeNull();
    expect(studioDownload.error).toBeNull();
    expect(crossDownload.error).not.toBeNull();
    expect(crossDownload.data).toBeNull();

    const deniedRowDelete = await firstSupabase
      .from("styling_references")
      .delete()
      .in("storage_path", [secondPath, studioPath])
      .select("storage_path");
    expect(deniedRowDelete.error).toBeNull();
    expect(deniedRowDelete.data).toEqual([]);

    const delegatedStudioDelete = await firstSupabase
      .from("styling_references")
      .delete()
      .eq("storage_path", delegatedStudioPath)
      .select("storage_path");
    expect(delegatedStudioDelete.error).toBeNull();
    expect(delegatedStudioDelete.data).toEqual([]);
    const delegatedStudioPersisted = await staffSupabase
      .from("styling_references")
      .select("storage_path,origin,uploaded_by_auth_user_id")
      .eq("storage_path", delegatedStudioPath)
      .single();
    expect(delegatedStudioPersisted.error).toBeNull();
    expect(delegatedStudioPersisted.data).toMatchObject({
      storage_path: delegatedStudioPath,
      origin: "studio",
      uploaded_by_auth_user_id: firstAuthUserId,
    });

    const ownRowDelete = await firstSupabase
      .from("styling_references")
      .delete()
      .eq("storage_path", firstPath)
      .select("storage_path");
    expect(ownRowDelete.error).toBeNull();
    expect(ownRowDelete.data).toEqual([{ storage_path: firstPath }]);

    const staffRowDelete = await staffSupabase
      .from("styling_references")
      .delete()
      .in("storage_path", [delegatedStudioPath, secondPath, studioPath])
      .select("storage_path");
    expect(staffRowDelete.error).toBeNull();
    expect(staffRowDelete.data?.map((row) => row.storage_path).sort()).toEqual(
      [delegatedStudioPath, secondPath, studioPath].sort(),
    );

    await firstSupabase.storage.from(STYLING_BUCKET).remove([secondPath, studioPath]);
    const [secondStillExists, studioStillExists] = await Promise.all([
      secondSupabase.storage.from(STYLING_BUCKET).download(secondPath),
      staffSupabase.storage.from(STYLING_BUCKET).download(studioPath),
    ]);
    expect(secondStillExists.error).toBeNull();
    expect(studioStillExists.error).toBeNull();

    const ownObjectDelete = await firstSupabase.storage.from(STYLING_BUCKET).remove([firstPath]);
    expect(ownObjectDelete.error).toBeNull();
    const staffObjectDelete = await staffSupabase.storage
      .from(STYLING_BUCKET)
      .remove([secondPath, studioPath]);
    expect(staffObjectDelete.error).toBeNull();
  }, 60_000);

  it("serializes concurrent inserts and never exceeds 20 references per shoot", async () => {
    const staffSeed = await staffSupabase.from("styling_references").insert({
      shoot_id: limitShootId,
      storage_path: `${staffAuthUserId}/${limitShootId}/${runId}-seed.webp`,
      caption: "Referência inicial do estúdio",
      origin: "studio",
      uploaded_by_auth_user_id: staffAuthUserId,
    });
    expect(staffSeed.error).toBeNull();

    const attempts = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        firstSupabase.from("styling_references").insert({
          shoot_id: limitShootId,
          storage_path: `${firstAuthUserId}/${limitShootId}/${runId}-${index}.webp`,
          caption: `Referência concorrente ${index}`,
          origin: "client",
          uploaded_by_auth_user_id: firstAuthUserId,
        }),
      ),
    );
    const successful = attempts.filter((result) => result.error === null);
    const rejected = attempts.filter((result) => result.error !== null);
    expect(successful).toHaveLength(19);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.error?.code).toBe("23514");

    const [ownerCount, otherClientCount, staffCount] = await Promise.all([
      firstSupabase
        .from("styling_references")
        .select("id", { count: "exact", head: true })
        .eq("shoot_id", limitShootId),
      secondSupabase
        .from("styling_references")
        .select("id", { count: "exact", head: true })
        .eq("shoot_id", limitShootId),
      staffSupabase
        .from("styling_references")
        .select("id", { count: "exact", head: true })
        .eq("shoot_id", limitShootId),
    ]);
    expect(ownerCount.error).toBeNull();
    expect(ownerCount.count).toBe(20);
    expect(otherClientCount.error).toBeNull();
    expect(otherClientCount.count).toBe(0);
    expect(staffCount.error).toBeNull();
    expect(staffCount.count).toBe(20);
  }, 60_000);
});
