// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock("@/db/client", () => ({ db: { select: mocks.select } }));

import { getClientReferralSummary, getReferralMetrics } from "@/domain/referrals/queries";

const CLIENT_ID = "00000000-0000-4000-8000-000000000401";

describe("getReferralMetrics", () => {
  beforeEach(() => vi.resetAllMocks());

  it("counts informed and converted referrals of the period in the database", async () => {
    const from = vi.fn().mockResolvedValue([{ informed: 4, converted: 2 }]);
    mocks.select.mockReturnValue({ from });

    await expect(getReferralMetrics({ from: "2026-09-01", to: "2026-09-30" })).resolves.toEqual({
      informed: 4,
      converted: 2,
    });

    const fields = mocks.select.mock.calls[0]?.[0] as { informed: SQL; converted: SQL };
    const dialect = new PgDialect();
    const informed = dialect.sqlToQuery(fields.informed);
    const converted = dialect.sqlToQuery(fields.converted);
    expect(informed.sql).toContain('count(*) filter (where "referrals"."created_at" >= $1::date and "referrals"."created_at" < $2::date + 1)');
    expect(converted.sql).toContain('"referrals"."converted_at" >= $1::date and "referrals"."converted_at" < $2::date + 1');
    expect(informed.params).toEqual(["2026-09-01", "2026-09-30"]);
  });

  it("returns zeros for an empty table and rejects a malformed period", async () => {
    mocks.select.mockReturnValue({ from: vi.fn().mockResolvedValue([]) });
    await expect(getReferralMetrics({ from: "2026-09-01", to: "2026-09-30" })).resolves.toEqual({
      informed: 0,
      converted: 0,
    });

    await expect(getReferralMetrics({ from: "setembro", to: "2026-09-30" })).rejects.toThrow();
  });
});

describe("getClientReferralSummary", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns who referred the Client and how many of her referrals converted", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: "referrer-1", name: "Ana" }]);
    const joinedWhere = vi.fn().mockReturnValue({ limit });
    const innerJoin = vi.fn().mockReturnValue({ where: joinedWhere });
    const countWhere = vi.fn().mockResolvedValue([{ total: 3, converted: 1 }]);
    mocks.select
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ innerJoin }) })
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: countWhere }) });

    await expect(getClientReferralSummary(CLIENT_ID)).resolves.toEqual({
      referredBy: { id: "referrer-1", name: "Ana" },
      made: 3,
      converted: 1,
    });

    const dialect = new PgDialect();
    expect(dialect.sqlToQuery(joinedWhere.mock.calls[0]?.[0]).sql).toContain('"referrals"."referred_client_id" = $1');
    expect(dialect.sqlToQuery(countWhere.mock.calls[0]?.[0]).sql).toContain('"referrals"."referrer_client_id" = $1');
  });
});
