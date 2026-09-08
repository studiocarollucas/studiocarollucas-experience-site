import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  postgres: vi.fn(() => ({ kind: "query-client" })),
  drizzle: vi.fn(() => ({ kind: "drizzle-client" })),
}));

vi.mock("postgres", () => ({ default: mocks.postgres }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: mocks.drizzle }));

describe("database client", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.postgres.mockClear();
    mocks.drizzle.mockClear();
    vi.stubEnv("DATABASE_URL", "postgres://user:password@pooler.example.test:6543/postgres");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disables query pipelining for the Supavisor transaction pooler", async () => {
    await import("@/db/client");

    expect(mocks.postgres).toHaveBeenCalledWith(process.env.DATABASE_URL, {
      prepare: false,
      max: 1,
      max_pipeline: 0,
    });
  });
});
