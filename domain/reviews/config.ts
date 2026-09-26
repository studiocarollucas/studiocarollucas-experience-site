import "server-only";

const MAX_URL_LENGTH = 2048;

/**
 * The studio's public Google review link (SCL-704/SCL-721), from the
 * server-only STUDIO_GOOGLE_REVIEW_URL, read at call time. Returns null when it
 * is missing or is not an absolute https URL: callers then send nothing and hide
 * the portal card instead of failing.
 */
export function readGoogleReviewUrl(
  value: string | undefined = process.env.STUDIO_GOOGLE_REVIEW_URL,
): string | null {
  const candidate = value?.trim();
  if (!candidate || candidate.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || !url.hostname) return null;
  } catch {
    return null;
  }
  return candidate;
}
