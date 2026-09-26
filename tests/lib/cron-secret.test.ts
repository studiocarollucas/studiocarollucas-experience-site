// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest, isCronSecretConfigured, MIN_CRON_SECRET_LENGTH } from "@/lib/auth/cron-secret";

const secret = "s".repeat(MIN_CRON_SECRET_LENGTH);

describe("cron secret", () => {
  it("requires a configured secret of at least 32 characters", () => {
    expect(MIN_CRON_SECRET_LENGTH).toBe(32);
    expect(isCronSecretConfigured(undefined)).toBe(false);
    expect(isCronSecretConfigured("")).toBe(false);
    expect(isCronSecretConfigured("short-secret")).toBe(false);
    expect(isCronSecretConfigured(secret)).toBe(true);
  });

  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedCronRequest(null, secret)).toBe(false);
    expect(isAuthorizedCronRequest("", secret)).toBe(false);
    expect(isAuthorizedCronRequest(secret, secret)).toBe(false);
    expect(isAuthorizedCronRequest(`Basic ${secret}`, secret)).toBe(false);
    expect(isAuthorizedCronRequest(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isAuthorizedCronRequest(`Bearer ${secret.slice(1)}`, secret)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", secret)).toBe(false);
  });
});
