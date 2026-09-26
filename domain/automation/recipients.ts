import { z } from "zod";

const recipientSchema = z.string().trim().toLowerCase().max(254).email();

/**
 * Normalized address, or null when missing/invalid. Flows check this before
 * enqueueing so a bad CRM email never aborts the business transaction.
 */
export function normalizeRecipient(email: string | null | undefined): string | null {
  if (typeof email !== "string") return null;
  const parsed = recipientSchema.safeParse(email);
  return parsed.success ? parsed.data : null;
}

/** First word of the client's name (≤ 60 chars) — the only personal data templates get. */
export function firstNameOf(name: string | null | undefined): string | undefined {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  const trimmed = first.slice(0, 60);
  return trimmed.length > 0 ? trimmed : undefined;
}
