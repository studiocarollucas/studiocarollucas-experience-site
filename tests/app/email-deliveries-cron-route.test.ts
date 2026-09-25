// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processDueDeliveries: vi.fn(),
  createDrizzleDeliveryStore: vi.fn(),
  resolveEmailDelivery: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("@/domain/automation/processor", () => ({ processDueDeliveries: mocks.processDueDeliveries }));
vi.mock("@/domain/automation/delivery-store", () => ({ createDrizzleDeliveryStore: mocks.createDrizzleDeliveryStore }));
vi.mock("@/lib/observability/report-error", () => ({ reportError: mocks.reportError }));
vi.mock("@/lib/email/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email/config")>()),
  resolveEmailDelivery: mocks.resolveEmailDelivery,
}));

import { GET, POST } from "@/app/api/cron/email-deliveries/route";
import { EmailConfigError } from "@/lib/email/config";

const secret = "c".repeat(48);
const url = "https://studio.test/api/cron/email-deliveries";
const summary = { staleFailed: 0, claimed: 2, sent: 1, retried: 1, failed: 0, lostLease: 0, errors: 0 };
const store = { kind: "store" };
const provider = { name: "resend", send: vi.fn() };

function request(authorization?: string, method = "GET") {
  return new Request(url, { method, headers: authorization ? { authorization } : {} });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("CRON_SECRET", secret);
  mocks.createDrizzleDeliveryStore.mockReturnValue(store);
  mocks.resolveEmailDelivery.mockReturnValue({
    mode: "resend",
    provider,
    from: "Stúdio <ola@studiocarollucas.com.br>",
    replyTo: undefined,
  });
  mocks.processDueDeliveries.mockResolvedValue(summary);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/api/cron/email-deliveries", () => {
  it("is unavailable when CRON_SECRET is missing or too short", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request(`Bearer ${secret}`))).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "short");
    expect((await GET(request("Bearer short"))).status).toBe(503);
    expect(mocks.processDueDeliveries).not.toHaveBeenCalled();
  });

  it("rejects missing or wrong credentials before touching email config or the queue", async () => {
    for (const authorization of [undefined, "Bearer wrong", secret, `Bearer ${secret}x`]) {
      const response = await GET(request(authorization));
      expect(response.status).toBe(401);
    }
    expect(mocks.resolveEmailDelivery).not.toHaveBeenCalled();
    expect(mocks.processDueDeliveries).not.toHaveBeenCalled();
  });

  it("processes due deliveries for GET (Vercel Cron) and POST, returning only counters", async () => {
    for (const method of ["GET", "POST"] as const) {
      const handler = method === "GET" ? GET : POST;
      const response = await handler(request(`Bearer ${secret}`, method));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true, mode: "resend", ...summary });
    }
    expect(mocks.processDueDeliveries).toHaveBeenCalledWith({
      store,
      provider,
      from: "Stúdio <ola@studiocarollucas.com.br>",
      replyTo: undefined,
    });
  });

  it("returns 503 and reports when email delivery is misconfigured", async () => {
    mocks.resolveEmailDelivery.mockImplementation(() => {
      throw new EmailConfigError("configuração de e-mail incompleta: RESEND_API_KEY");
    });

    const response = await GET(request(`Bearer ${secret}`));

    expect(response.status).toBe(503);
    expect(mocks.processDueDeliveries).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledOnce();
  });

  it("returns a neutral 500 and reports a sanitized error when processing crashes", async () => {
    mocks.processDueDeliveries.mockRejectedValue(new Error("connect ECONNREFUSED for ana@example.test"));

    const response = await GET(request(`Bearer ${secret}`));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(mocks.reportError).toHaveBeenCalledOnce();
    expect(String((mocks.reportError.mock.calls[0][0] as Error).message)).not.toContain("ana@example.test");
  });
});
