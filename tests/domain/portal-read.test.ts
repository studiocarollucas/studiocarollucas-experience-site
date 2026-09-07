import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { readPortalSnapshot } from "@/domain/portal/read";

type QueryResult = { data: unknown; error: unknown };

function thenableQuery(result: QueryResult, onSelect: (columns: string) => void) {
  const query = {
    select: (columns: string) => {
      onSelect(columns);
      return query;
    },
    eq: () => query,
    order: () => query,
    maybeSingle: async () => result,
    then: <TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return query;
}

type FixtureOptions = {
  amount?: unknown;
  authUser?: { id: string } | null;
  authError?: unknown;
  results?: Partial<Record<string, QueryResult>>;
  signedError?: unknown;
};

function portalFixture(options: FixtureOptions = {}) {
  const amount = Object.hasOwn(options, "amount") ? options.amount : 250;
  const results: Record<string, QueryResult> = {
    clients: { data: { id: "client-1", name: "Mariana" }, error: null },
    shoots: {
      data: [
        {
          id: "shoot-1",
          client_id: "client-1",
          experience_package_id: "package-1",
          shoot_date: "2030-12-10",
          start_time: "15:00:00",
          status: "preparacao",
          agreed_price: 9999999999.99,
          payment_status: "parcial",
          portal_enabled: true,
          location_name: null,
          location_address: null,
          client_guidance: null,
        },
      ],
      error: null,
    },
    experience_packages: {
      data: {
        id: "package-1",
        name: "Aurora",
        included_photos: 20,
        duration_minutes: 90,
        scenes: "2",
        make_included: true,
        outfits_limit: 3,
        clutch_included: true,
      },
      error: null,
    },
    preparation_tasks: {
      data: [
        {
          id: "task-1",
          shoot_id: "shoot-1",
          type: "figurino",
          title: "Escolher figurinos",
          status: "pendente",
          due_at: null,
          visible_to_client: true,
          client_actionable: true,
          completed_at: null,
          created_at: "2030-01-01T12:00:00Z",
        },
      ],
      error: null,
    },
    payments: {
      data: [
        {
          id: "payment-1",
          shoot_id: "shoot-1",
          amount,
          paid_at: "2030-01-01T12:00:00Z",
          status: "confirmado",
        },
      ],
      error: null,
    },
    styling_references: {
      data: [
        {
          id: "reference-1",
          shoot_id: "shoot-1",
          storage_path: "auth-1/shoot-1/reference.webp",
          caption: "Luz lateral",
          origin: "client",
          uploaded_by_auth_user_id: "auth-1",
          created_at: "2030-01-02T12:00:00Z",
        },
      ],
      error: null,
    },
    ...options.results,
  };
  const selectedColumns: Record<string, string> = {};
  const fromCalls: string[] = [];
  const createSignedUrls = async () => ({
    data: options.signedError
      ? null
      : [{ signedUrl: "https://private.example.test/reference?signed=1" }],
    error: options.signedError ?? null,
  });

  const supabase = {
    auth: {
      getUser: async () => ({
        data: { user: options.authUser === undefined ? { id: "auth-1" } : options.authUser },
        error: options.authError ?? null,
      }),
    },
    from: (table: string) => {
      fromCalls.push(table);
      return thenableQuery(results[table], (columns) => {
        selectedColumns[table] = columns;
      });
    },
    storage: { from: () => ({ createSignedUrls }) },
  } as unknown as SupabaseClient;

  return { supabase, selectedColumns, fromCalls };
}

describe("readPortalSnapshot", () => {
  it("normalizes PostgREST numeric values into canonical decimal strings", async () => {
    const { supabase } = portalFixture({ amount: 250 });
    const snapshot = await readPortalSnapshot(supabase, new Date("2030-01-01T12:00:00-04:00"));

    expect(snapshot.shoot?.agreedPrice).toBe("9999999999.99");
    expect(snapshot.payments[0].amount).toBe("250.00");
    expect(snapshot.experience).toMatchObject({ id: "package-1", name: "Aurora" });
    expect(snapshot.tasks).toEqual([
      {
        id: "task-1",
        shootId: "shoot-1",
        type: "figurino",
        title: "Escolher figurinos",
        status: "pendente",
        dueAt: null,
        visibleToClient: true,
        clientActionable: true,
        completedAt: null,
        createdAt: "2030-01-01T12:00:00Z",
      },
    ]);
    expect(snapshot.viewerAuthUserId).toBe("auth-1");
    expect(snapshot.references).toEqual([
      {
        id: "reference-1",
        shootId: "shoot-1",
        storagePath: "auth-1/shoot-1/reference.webp",
        signedUrl: "https://private.example.test/reference?signed=1",
        caption: "Luz lateral",
        origin: "client",
        uploadedByAuthUserId: "auth-1",
        createdAt: "2030-01-02T12:00:00Z",
      },
    ]);
  });

  it.each([null, "invalid"])(
    "turns malformed money (%p) into a safe public read error",
    async (amount) => {
      const { supabase } = portalFixture({ amount });
      await expect(
        readPortalSnapshot(supabase, new Date("2030-01-01T12:00:00-04:00"))
      ).rejects.toMatchObject({
        name: "PortalReadError",
        code: "query_failed",
        message: "portal data unavailable",
        cause: expect.any(TypeError),
      });
    }
  );

  it("rejects missing authentication and an authenticated user without a linked client", async () => {
    const unauthenticated = portalFixture({ authUser: null });
    await expect(readPortalSnapshot(unauthenticated.supabase)).rejects.toMatchObject({
      code: "unauthenticated",
      message: "portal data unavailable",
    });
    expect(unauthenticated.fromCalls).toEqual([]);

    const unlinked = portalFixture({ results: { clients: { data: null, error: null } } });
    await expect(readPortalSnapshot(unlinked.supabase)).rejects.toMatchObject({
      code: "unlinked",
      message: "portal data unavailable",
    });
    expect(unlinked.fromCalls).toEqual(["clients"]);
  });

  it.each(["clients", "shoots", "experience_packages", "preparation_tasks", "payments"])(
    "wraps a %s query failure without exposing its message",
    async (table) => {
      const databaseError = new Error(`raw ${table} failure`);
      const { supabase } = portalFixture({
        results: { [table]: { data: null, error: databaseError } },
      });

      await expect(
        readPortalSnapshot(supabase, new Date("2030-01-01T12:00:00-04:00"))
      ).rejects.toMatchObject({
        code: "query_failed",
        message: "portal data unavailable",
        cause: databaseError,
      });
    }
  );

  it("wraps reference row failures without exposing their message", async () => {
    const rowError = new Error("raw styling_references failure");
    const { supabase } = portalFixture({
      results: { styling_references: { data: null, error: rowError } },
    });

    await expect(
      readPortalSnapshot(supabase, new Date("2030-01-01T12:00:00-04:00"))
    ).rejects.toMatchObject({
      code: "query_failed",
      message: "portal data unavailable",
      cause: expect.objectContaining({
        message: "styling references unavailable",
        cause: rowError,
      }),
    });
  });

  it("wraps signed reference failures in the public portal read error", async () => {
    const signingError = new Error("raw signed URL failure");
    const { supabase } = portalFixture({ signedError: signingError });

    await expect(
      readPortalSnapshot(supabase, new Date("2030-01-01T12:00:00-04:00"))
    ).rejects.toMatchObject({
      code: "query_failed",
      message: "portal data unavailable",
      cause: expect.objectContaining({
        message: "styling references unavailable",
        cause: signingError,
      }),
    });
  });

  it("returns the empty snapshot before child queries when no shoot is eligible", async () => {
    const { supabase, fromCalls } = portalFixture({
      results: { shoots: { data: [], error: null } },
    });

    await expect(readPortalSnapshot(supabase)).resolves.toEqual({
      client: { id: "client-1", name: "Mariana" },
      viewerAuthUserId: "auth-1",
      shoot: null,
      experience: null,
      tasks: [],
      payments: [],
      references: [],
    });
    expect(fromCalls).toEqual(["clients", "shoots"]);
  });

  it("locks every query to the approved client-safe column projection", async () => {
    const { supabase, selectedColumns } = portalFixture();

    await readPortalSnapshot(supabase, new Date("2030-01-01T12:00:00-04:00"));

    expect(selectedColumns).toEqual({
      clients: "id,name",
      shoots:
        "id,client_id,experience_package_id,shoot_date,start_time,status,agreed_price,payment_status,portal_enabled,location_name,location_address,client_guidance",
      experience_packages:
        "id,name,included_photos,duration_minutes,scenes,make_included,outfits_limit,clutch_included",
      preparation_tasks:
        "id,shoot_id,type,title,status,due_at,visible_to_client,client_actionable,completed_at,created_at",
      payments: "id,shoot_id,amount,paid_at,status",
      styling_references:
        "id,shoot_id,storage_path,caption,origin,uploaded_by_auth_user_id,created_at",
    });
    expect(selectedColumns.clients).not.toContain("auth_user_id");
    expect(Object.values(selectedColumns).join(",")).not.toMatch(/notes|proof/);
  });
});
