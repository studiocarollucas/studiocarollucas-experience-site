// @vitest-environment node
import { describe, expect, it } from "vitest";
import { computeRetryDelayMs, DEFAULT_RETRY_POLICY, planDeliveryFailure } from "@/domain/automation/retry";
import { sanitizeDeliveryError } from "@/domain/automation/sanitize";

const minute = 60_000;

describe("computeRetryDelayMs", () => {
  it("doubles from five minutes per attempt", () => {
    expect([1, 2, 3, 4].map((attempt) => computeRetryDelayMs(attempt))).toEqual([5 * minute, 10 * minute, 20 * minute, 40 * minute]);
  });

  it("is capped at six hours and treats invalid attempts as the first", () => {
    expect(computeRetryDelayMs(30)).toBe(DEFAULT_RETRY_POLICY.maxDelayMs);
    expect(DEFAULT_RETRY_POLICY.maxDelayMs).toBe(6 * 60 * minute);
    expect(computeRetryDelayMs(0)).toBe(5 * minute);
    expect(computeRetryDelayMs(Number.NaN)).toBe(5 * minute);
  });

  it("accepts a custom policy", () => {
    expect(computeRetryDelayMs(3, { baseDelayMs: 1_000, maxDelayMs: 3_000 })).toBe(3_000);
  });
});

describe("planDeliveryFailure", () => {
  const now = new Date("2030-01-01T12:00:00.000Z");

  it("schedules a retry for a transient failure while attempts remain", () => {
    expect(planDeliveryFailure({ attemptCount: 2, maxAttempts: 5, retryable: true, now })).toEqual({
      kind: "retry",
      nextAttemptAt: new Date(now.getTime() + 10 * minute),
    });
  });

  it("fails permanently when attempts are exhausted or the error is permanent", () => {
    expect(planDeliveryFailure({ attemptCount: 5, maxAttempts: 5, retryable: true, now })).toEqual({ kind: "failed" });
    expect(planDeliveryFailure({ attemptCount: 1, maxAttempts: 5, retryable: false, now })).toEqual({ kind: "failed" });
  });
});

describe("sanitizeDeliveryError", () => {
  it("removes addresses, API keys and bearer tokens", () => {
    const message = sanitizeDeliveryError(
      new Error("Invalid `to` field: ana.silva+teste@exemplo.com.br rejected (key re_AbC123_xyz, Authorization: Bearer abc.def-ghi)"),
    );
    expect(message).not.toContain("ana.silva");
    expect(message).not.toContain("exemplo.com.br");
    expect(message).not.toContain("re_AbC123_xyz");
    expect(message).not.toContain("abc.def-ghi");
    expect(message).toContain("[e-mail removido]");
    expect(message).toContain("[segredo removido]");
  });

  it("normalizes whitespace, truncates and handles non-Error values", () => {
    expect(sanitizeDeliveryError(new Error("a\n\n   b"))).toBe("a b");
    expect(sanitizeDeliveryError("x".repeat(900))).toHaveLength(500);
    expect(sanitizeDeliveryError(undefined)).toBe("erro desconhecido");
    expect(sanitizeDeliveryError({ unexpected: true })).toBe("erro desconhecido");
  });
});
