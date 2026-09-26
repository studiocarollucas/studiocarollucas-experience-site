// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  scheduleReviewRequests: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("@/domain/automation/flows/review-requests", () => ({ scheduleReviewRequests: mocks.scheduleReviewRequests }));
vi.mock("@/lib/observability/report-error", () => ({ reportError: mocks.reportError }));

import { GET, POST } from "@/app/api/cron/review-requests/route";

const secret = "c".repeat(48);
const url = "https://studio.test/api/cron/review-requests";
const summary = { today: "2026-10-10", configured: true, candidates: 3, enqueued: 2, alreadyRequested: 1, notDue: 0, noEmail: 0, errors: 0 };

function request(authorization?: string, method = "GET") {
  return new Request(url, { method, headers: authorization ? { authorization } : {} });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("CRON_SECRET", secret);
  mocks.scheduleReviewRequests.mockResolvedValue(summary);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/api/cron/review-requests (SCL-704)", () => {
  it("is unavailable when CRON_SECRET is missing or too short", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request(`Bearer ${secret}`))).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "short");
    expect((await GET(request("Bearer short"))).status).toBe(503);
    expect(mocks.scheduleReviewRequests).not.toHaveBeenCalled();
  });

  it("rejects missing or wrong credentials before touching the database", async () => {
    for (const authorization of [undefined, "Bearer wrong", secret, `Bearer ${secret}x`]) {
      const response = await GET(request(authorization));
      expect(response.status).toBe(401);
    }
    expect(mocks.scheduleReviewRequests).not.toHaveBeenCalled();
  });

  it("schedules review requests for GET (Vercel Cron) and POST, returning only counters", async () => {
    for (const method of ["GET", "POST"] as const) {
      const handler = method === "GET" ? GET : POST;
      const response = await handler(request(`Bearer ${secret}`, method));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({ ok: true, ...summary });
    }
    expect(mocks.scheduleReviewRequests).toHaveBeenCalledTimes(2);
  });

  it("returns a neutral 500 and reports a sanitized error when scheduling crashes", async () => {
    mocks.scheduleReviewRequests.mockRejectedValue(new Error("connect ECONNREFUSED for ana@example.test"));

    const response = await GET(request(`Bearer ${secret}`));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("ECONNREFUSED");
    expect(mocks.reportError).toHaveBeenCalledOnce();
    expect(String((mocks.reportError.mock.calls[0][0] as Error).message)).not.toContain("ana@example.test");
  });
});
