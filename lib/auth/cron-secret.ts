import { createHash, timingSafeEqual } from "node:crypto";

export const MIN_CRON_SECRET_LENGTH = 32;

export function isCronSecretConfigured(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.length >= MIN_CRON_SECRET_LENGTH;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Checks `Authorization: Bearer <CRON_SECRET>` (the header Vercel Cron sends).
 * Both sides are hashed to equal-length digests and compared with
 * timingSafeEqual, so neither content nor length leaks through timing.
 */
export function isAuthorizedCronRequest(authorizationHeader: string | null, secret: string): boolean {
  const prefix = "Bearer ";
  const provided =
    authorizationHeader && authorizationHeader.startsWith(prefix) ? authorizationHeader.slice(prefix.length) : "";
  const matches = timingSafeEqual(digest(provided), digest(secret));
  return matches && provided.length > 0;
}
