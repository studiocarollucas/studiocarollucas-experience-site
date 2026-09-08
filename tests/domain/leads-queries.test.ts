import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn() } }));
vi.mock("@/db/client", () => ({ db: mocks.db }));

import { buildLeadSearchPredicate, listLeads, normalizeLeadListParams } from "@/domain/leads/queries";

describe("normalizeLeadListParams", () => {
  it("normalizes filters and uses the admin default pagination", () => {
    expect(
      normalizeLeadListParams({
        query: "  Maria  ",
        status: "novo",
        source: "  quiz  ",
        ownerId: "  owner-1  ",
        page: "3",
        limit: "50",
      }),
    ).toEqual({
      query: "Maria",
      status: "novo",
      source: "quiz",
      ownerId: "owner-1",
      page: 3,
      limit: 50,
    });
  });

  it("drops empty or invalid filters and clamps the page and limit", () => {
    expect(normalizeLeadListParams({ status: "invalid", source: "  ", ownerId: " ", page: "0", limit: "999" })).toEqual({
      query: undefined,
      status: undefined,
      source: undefined,
      ownerId: undefined,
      page: 1,
      limit: 100,
    });
    expect(normalizeLeadListParams({ limit: "0" }).limit).toBe(25);
  });
});

describe("buildLeadSearchPredicate", () => {
  it("searches a lead's name, phone, and email", () => {
    const predicate = buildLeadSearchPredicate("maria");
    const query = new PgDialect().sqlToQuery(predicate!);

    expect(query.sql).toContain('"leads"."name" ilike $1');
    expect(query.sql).toContain('"leads"."phone" ilike $2');
    expect(query.sql).toContain('"leads"."email" ilike $3');
    expect(query.params).toEqual(["%maria%", "%maria%", "%maria%"]);
  });
});

describe("listLeads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("orders the newest leads first and applies the normalized page window", async () => {
    const orderBy = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue([]) }),
    });
    const rowsQuery = {
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy }) }),
      }),
    };
    mocks.db.select
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ total: 0 }]) }) })
      .mockReturnValueOnce(rowsQuery);

    await listLeads({ page: 2, limit: 30 });

    expect(orderBy).toHaveBeenCalledOnce();
    const ordering = new PgDialect().sqlToQuery(
      sql`order by ${orderBy.mock.calls[0][0]}, ${orderBy.mock.calls[0][1]}`,
    );
    expect(ordering.sql).toBe('order by "leads"."created_at" desc, "leads"."id" desc');
  });
});
