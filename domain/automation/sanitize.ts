const EMAIL_PATTERN = /[^\s@<>"'`(),;:[\]]+@[^\s@<>"'`(),;:[\]]+/g;
const BEARER_PATTERN = /\bBearer\s+[^\s"',;]+/gi;
const RESEND_KEY_PATTERN = /\bre_[A-Za-z0-9_]+/g;

export const MAX_DELIVERY_ERROR_LENGTH = 500;

/**
 * Turns any thrown value into text safe to persist in `last_error` and to log:
 * no recipient addresses, no API keys/tokens, single-line and bounded.
 */
export function sanitizeDeliveryError(error: unknown, maxLength: number = MAX_DELIVERY_ERROR_LENGTH): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const sanitized = raw
    .replace(BEARER_PATTERN, "Bearer [segredo removido]")
    .replace(RESEND_KEY_PATTERN, "[segredo removido]")
    .replace(EMAIL_PATTERN, "[e-mail removido]")
    .replace(/\s+/g, " ")
    .trim();
  return (sanitized || "erro desconhecido").slice(0, maxLength);
}
