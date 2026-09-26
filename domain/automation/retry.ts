export type RetryPolicy = {
  baseDelayMs: number;
  maxDelayMs: number;
};

/** 5, 10, 20, 40 min … capped at 6 h. With the default 5 attempts: ~75 min end to end. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  baseDelayMs: 5 * 60_000,
  maxDelayMs: 6 * 60 * 60_000,
};

export const DEFAULT_MAX_ATTEMPTS = 5;

/** Delay before the next attempt, given how many attempts have already run (1-based). */
export function computeRetryDelayMs(attempt: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
  const completed = Number.isFinite(attempt) && attempt >= 1 ? Math.floor(attempt) : 1;
  // Cap the exponent so large attempt numbers cannot overflow to Infinity.
  const exponent = Math.min(completed - 1, 30);
  return Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** exponent);
}

export type DeliveryFailurePlan = { kind: "retry"; nextAttemptAt: Date } | { kind: "failed" };

export function planDeliveryFailure(input: {
  attemptCount: number;
  maxAttempts: number;
  retryable: boolean;
  now: Date;
  policy?: RetryPolicy;
}): DeliveryFailurePlan {
  if (!input.retryable || input.attemptCount >= input.maxAttempts) return { kind: "failed" };
  return {
    kind: "retry",
    nextAttemptAt: new Date(input.now.getTime() + computeRetryDelayMs(input.attemptCount, input.policy)),
  };
}
