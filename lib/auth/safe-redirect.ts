/**
 * Guards against open redirects: only same-origin absolute paths are accepted.
 * `//evil.com` is a protocol-relative URL, so it must be rejected even though it
 * starts with "/".
 */
export function isSafeRedirect(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

export function safeRedirect(path: unknown, fallback: string): string {
  return isSafeRedirect(path) ? path : fallback;
}
