const PLACEHOLDER_ORIGIN = "https://placeholder.invalid";

/**
 * Guards against open redirects: only same-origin absolute paths are accepted.
 *
 * Pattern-matching the string is not enough. Browsers normalize a backslash, tab or newline
 * appearing after the leading "/" into an authority separator when they resolve a Location
 * header, so "/\\evil.com", "/\t/evil.com" and "/\n/evil.com" all resolve off-origin despite
 * starting with a single "/". Resolving against a placeholder origin and comparing the result
 * makes the URL parser — the same component the browser uses — the authority on what the path
 * actually means.
 */
export function isSafeRedirect(path: unknown): path is string {
  if (typeof path !== "string" || !path.startsWith("/")) return false;

  try {
    return new URL(path, PLACEHOLDER_ORIGIN).origin === PLACEHOLDER_ORIGIN;
  } catch {
    return false;
  }
}

export function safeRedirect(path: unknown, fallback: string): string {
  return isSafeRedirect(path) ? path : fallback;
}
