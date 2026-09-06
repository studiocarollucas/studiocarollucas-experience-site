import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, sql } = vi.hoisted(() => ({
  db: { select: vi.fn(), update: vi.fn() },
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
}));

vi.mock("@/db/client", () => ({ db }));
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return { ...actual, sql };
});

import { decideClientLink, normalizeClientEmail } from "@/lib/auth/client-link";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ID = "00000000-0000-4000-8000-000000000002";

function selectRows(rows: { id: string; authUserId: string | null }[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { query: { from }, where, limit };
}

function updateRows(rows: { id: string }[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  return { query: { set }, where, returning };
}

beforeEach(() => {
  db.select.mockReset();
  db.update.mockReset();
  sql.mockClear();
});

describe("client-link", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeClientEmail("  Maria@Example.COM ")).toBe("maria@example.com");
  });

  it("requests a link for one unlinked client", () => {
    expect(decideClientLink([{ id: "client-1", authUserId: null }], USER_ID)).toEqual({
      kind: "link",
      clientId: "client-1",
    });
  });

  it("accepts an idempotent existing link", () => {
    expect(decideClientLink([{ id: "client-1", authUserId: USER_ID }], USER_ID)).toEqual({
      kind: "linked",
      clientId: "client-1",
    });
  });

  it.each([
    [[], "no_match"],
    [[{ id: "a", authUserId: null }, { id: "b", authUserId: null }], "ambiguous"],
    [[{ id: "a", authUserId: OTHER_ID }], "owned_by_another_user"],
  ] as const)("denies unsafe link candidates", (matches, reason) => {
    expect(decideClientLink([...matches], USER_ID)).toEqual({ kind: "denied", reason });
  });
});

describe("linkAuthUserToClient", () => {
  it("queries a normalized email and caps candidates at two", async () => {
    const initial = selectRows([{ id: "client-1", authUserId: USER_ID }]);
    db.select.mockReturnValueOnce(initial.query);

    const { linkAuthUserToClient } = await import("@/lib/auth/client-link");
    await expect(linkAuthUserToClient({ id: USER_ID, email: " Maria@Example.COM " })).resolves.toEqual({
      clientId: "client-1",
    });

    expect(initial.limit).toHaveBeenCalledWith(2);
    expect(sql).toHaveBeenCalledWith(expect.any(Array), expect.anything(), "maria@example.com");
  });

  it("links an unclaimed client through the conditional update", async () => {
    const initial = selectRows([{ id: "client-1", authUserId: null }]);
    const update = updateRows([{ id: "client-1" }]);
    db.select.mockReturnValueOnce(initial.query);
    db.update.mockReturnValueOnce(update.query);

    const { linkAuthUserToClient } = await import("@/lib/auth/client-link");
    await expect(linkAuthUserToClient({ id: USER_ID, email: "maria@example.com" })).resolves.toEqual({
      clientId: "client-1",
    });

    expect(db.update).toHaveBeenCalledOnce();
    expect(update.where).toHaveBeenCalledOnce();
  });

  it("accepts a race only when the record was linked to the same Auth user", async () => {
    const initial = selectRows([{ id: "client-1", authUserId: null }]);
    const update = updateRows([]);
    const raced = selectRows([{ id: "client-1", authUserId: USER_ID }]);
    db.select.mockReturnValueOnce(initial.query).mockReturnValueOnce(raced.query);
    db.update.mockReturnValueOnce(update.query);

    const { linkAuthUserToClient } = await import("@/lib/auth/client-link");
    await expect(linkAuthUserToClient({ id: USER_ID, email: "maria@example.com" })).resolves.toEqual({
      clientId: "client-1",
    });
  });

  it("denies a race linked to another Auth user", async () => {
    const initial = selectRows([{ id: "client-1", authUserId: null }]);
    const update = updateRows([]);
    const raced = selectRows([{ id: "client-1", authUserId: OTHER_ID }]);
    db.select.mockReturnValueOnce(initial.query).mockReturnValueOnce(raced.query);
    db.update.mockReturnValueOnce(update.query);

    const { linkAuthUserToClient } = await import("@/lib/auth/client-link");
    await expect(linkAuthUserToClient({ id: USER_ID, email: "maria@example.com" })).rejects.toEqual(
      expect.objectContaining({ reason: "owned_by_another_user" })
    );
  });
});
