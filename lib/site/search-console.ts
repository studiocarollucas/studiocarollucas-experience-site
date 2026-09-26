import type { Metadata } from "next";

/** Google Search Console HTML-tag verification, omitted when the token is not configured. */
export function siteVerification(
  googleToken = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
): Metadata["verification"] {
  const google = googleToken?.trim();
  return google ? { google } : undefined;
}
