// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailProviderError, type EmailMessage, type EmailProvider } from "@/lib/email/provider";
import {
  deliveryIdempotencyKey,
  processDueDeliveries,
  type ClaimedDelivery,
  type DeliveryStore,
} from "@/domain/automation/processor";

const now = new Date("2030-01-01T12:00:00.000Z");
const minute = 60_000;

function claimed(overrides: Partial<ClaimedDelivery> = {}): ClaimedDelivery {
  return {
    id: "00000000-0000-4000-8000-000000000301",
    eventId: "00000000-0000-4000-8000-000000000201",
    templateKey: "boas-vindas",
    templateVersion: 1,
    recipient: "ana.privada@example.test",
    templateData: { firstName: "Ana" },
    attemptCount: 1,
    maxAttempts: 5,
    ...overrides,
  };
}

function createStore(rows: ClaimedDelivery[]) {
  return {
    failExhaustedLeases: vi.fn<DeliveryStore["failExhaustedLeases"]>().mockResolvedValue(0),
    claimDue: vi.fn<DeliveryStore["claimDue"]>().mockResolvedValue(rows),
    markSent: vi.fn<DeliveryStore["markSent"]>().mockResolvedValue(true),
    markRetry: vi.fn<DeliveryStore["markRetry"]>().mockResolvedValue(true),
    markFailed: vi.fn<DeliveryStore["markFailed"]>().mockResolvedValue(true),
  } satisfies DeliveryStore;
}

function createProvider(impl: (message: EmailMessage) => Promise<{ provider: string; messageId: string | null }>) {
  const send = vi.fn((message: EmailMessage) => impl(message));
  const provider: EmailProvider = { name: "fake", send };
  return { provider, send };
}

let logs: string[];

beforeEach(() => {
  logs = [];
  const capture = (line: unknown) => {
    logs.push(String(line));
  };
  vi.spyOn(console, "log").mockImplementation(capture);
  vi.spyOn(console, "warn").mockImplementation(capture);
  vi.spyOn(console, "error").mockImplementation(capture);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function run(store: DeliveryStore, provider: EmailProvider, reportError = vi.fn()) {
  return processDueDeliveries({
    store,
    provider,
    from: "Stúdio Carol Lucas <ola@studiocarollucas.com.br>",
    replyTo: "experiencia@studiocarollucas.com.br",
    now: () => now,
    reportError,
  });
}

describe("processDueDeliveries", () => {
  it("claims due rows with a lease, renders the pinned template and marks them sent", async () => {
    const store = createStore([claimed()]);
    const { provider, send } = createProvider(async () => ({ provider: "fake", messageId: "msg_1" }));

    await expect(run(store, provider)).resolves.toEqual({
      staleFailed: 0,
      claimed: 1,
      sent: 1,
      retried: 0,
      failed: 0,
      lostLease: 0,
      errors: 0,
    });

    expect(store.failExhaustedLeases).toHaveBeenCalledWith(now);
    expect(store.claimDue).toHaveBeenCalledWith({ now, limit: 20, leaseMs: 5 * minute });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana.privada@example.test",
        from: "Stúdio Carol Lucas <ola@studiocarollucas.com.br>",
        replyTo: "experiencia@studiocarollucas.com.br",
        subject: "Boas-vindas ao Stúdio Carol Lucas",
        tags: [
          { name: "template", value: "boas-vindas" },
          { name: "template_version", value: "1" },
        ],
      }),
      { idempotencyKey: deliveryIdempotencyKey("00000000-0000-4000-8000-000000000301") },
    );
    expect(deliveryIdempotencyKey("abc")).toBe("notification-delivery/abc");
    expect(store.markSent).toHaveBeenCalledWith({
      id: "00000000-0000-4000-8000-000000000301",
      attemptCount: 1,
      provider: "fake",
      providerMessageId: "msg_1",
      now,
    });
  });

  it("schedules a backoff retry for a transient provider failure", async () => {
    const store = createStore([claimed({ attemptCount: 2 })]);
    const { provider } = createProvider(async () => {
      throw new EmailProviderError("Resend 429 rate_limit_exceeded: slow down", { retryable: true, status: 429 });
    });
    const reportError = vi.fn();

    await expect(run(store, provider, reportError)).resolves.toMatchObject({ retried: 1, failed: 0 });

    expect(store.markRetry).toHaveBeenCalledWith({
      id: "00000000-0000-4000-8000-000000000301",
      attemptCount: 2,
      nextAttemptAt: new Date(now.getTime() + 10 * minute),
      error: "Resend 429 rate_limit_exceeded: slow down",
      now,
    });
    expect(reportError).not.toHaveBeenCalled();
  });

  it("fails permanently after the last attempt and reports to Sentry without personal data", async () => {
    const store = createStore([claimed({ attemptCount: 5 })]);
    const { provider } = createProvider(async () => {
      throw new EmailProviderError("Resend 503 internal: ana.privada@example.test unreachable", { retryable: true, status: 503 });
    });
    const reportError = vi.fn();

    await expect(run(store, provider, reportError)).resolves.toMatchObject({ failed: 1, retried: 0 });

    const failed = store.markFailed.mock.calls[0][0];
    expect(failed).toMatchObject({ id: "00000000-0000-4000-8000-000000000301", attemptCount: 5, now });
    expect(failed.error).not.toContain("ana.privada");
    expect(reportError).toHaveBeenCalledOnce();
    const [reported, context] = reportError.mock.calls[0];
    expect(String((reported as Error).message)).not.toContain("ana.privada");
    expect(context).toMatchObject({
      tags: { area: "email-automation", templateKey: "boas-vindas" },
      extra: { deliveryId: "00000000-0000-4000-8000-000000000301", attempt: 5, status: 503 },
    });
  });

  it("does not retry permanent provider errors or broken templates", async () => {
    const store = createStore([
      claimed({ id: "a" }),
      claimed({ id: "b", templateVersion: 99 }),
      claimed({ id: "c", templateData: { firstName: "" } }),
    ]);
    const { provider, send } = createProvider(async () => {
      throw new EmailProviderError("Resend 422 validation_error: bad", { retryable: false, status: 422 });
    });

    await expect(run(store, provider)).resolves.toMatchObject({ claimed: 3, failed: 3, retried: 0 });
    expect(send).toHaveBeenCalledOnce();
    expect(store.markRetry).not.toHaveBeenCalled();
    expect(store.markFailed.mock.calls.map(([call]) => call.id)).toEqual(["a", "b", "c"]);
  });

  it("counts a lost lease instead of overwriting a row reclaimed elsewhere", async () => {
    const store = createStore([claimed()]);
    store.markSent.mockResolvedValue(false);
    const { provider } = createProvider(async () => ({ provider: "fake", messageId: null }));

    await expect(run(store, provider)).resolves.toMatchObject({ sent: 0, lostLease: 1 });
  });

  it("keeps processing when bookkeeping fails for one delivery", async () => {
    const store = createStore([claimed({ id: "a" }), claimed({ id: "b" })]);
    store.markSent.mockRejectedValueOnce(new Error("connection reset")).mockResolvedValueOnce(true);
    const { provider } = createProvider(async () => ({ provider: "fake", messageId: "m" }));
    const reportError = vi.fn();

    await expect(run(store, provider, reportError)).resolves.toMatchObject({ sent: 1, errors: 1 });
    expect(reportError).toHaveBeenCalledOnce();
  });

  it("fails leases that expired after the last attempt and reports them", async () => {
    const store = createStore([]);
    store.failExhaustedLeases.mockResolvedValue(2);
    const { provider, send } = createProvider(async () => ({ provider: "fake", messageId: null }));
    const reportError = vi.fn();

    await expect(run(store, provider, reportError)).resolves.toMatchObject({ staleFailed: 2, claimed: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledOnce();
  });

  it("never logs recipients, subjects or template data", async () => {
    const store = createStore([claimed({ id: "a" }), claimed({ id: "b", attemptCount: 5 })]);
    let call = 0;
    const { provider } = createProvider(async () => {
      call += 1;
      if (call === 1) return { provider: "fake", messageId: "m" };
      throw new Error("socket closed for ana.privada@example.test");
    });

    await run(store, provider);

    const output = logs.join("\n");
    expect(logs.length).toBeGreaterThan(0);
    expect(output).not.toContain("ana.privada");
    expect(output).not.toContain("Boas-vindas ao Stúdio");
    expect(output).not.toContain('"firstName"');
    expect(output).toContain('"deliveryId":"a"');
  });
});
