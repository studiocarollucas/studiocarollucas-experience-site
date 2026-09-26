// Client-safe (no db imports): Admin actions map ReferralError to an actionable
// message without pulling the database graph.

/** A referral rule violation the caller can show to staff as is. */
export class ReferralError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferralError";
  }
}

export const REFERRAL_MESSAGES = {
  self: "A cliente não pode indicar a si mesma.",
  cycle: "Esta indicação criaria um ciclo: a cliente indicada já aparece na cadeia de quem indicou.",
  alreadyReferred: "Esta cliente já está registrada como indicada por outra indicação.",
  leadAlreadyReferred: "Este Lead já tem uma indicação registrada.",
  convertedLocked: "Indicação já convertida não pode ser alterada ou removida.",
  leadMissing: "Lead inexistente.",
  referrerMissing: "Cliente indicadora inexistente.",
  referredMissing: "Cliente indicada inexistente.",
  conversionSelf:
    "A cliente escolhida é a própria indicadora deste Lead. Remova a indicação do Lead ou escolha outra cliente antes de converter.",
  conversionAlreadyReferred:
    "A cliente escolhida já está registrada como indicada por outra indicação. Remova a indicação do Lead antes de converter.",
  conversionMismatch: "A indicação deste Lead já aponta para outra cliente.",
} as const;

// Constraint (and trigger) names from migration 0051.
const CONSTRAINT_MESSAGES: Record<string, string> = {
  referrals_no_cycle: REFERRAL_MESSAGES.cycle,
  referrals_not_self: REFERRAL_MESSAGES.self,
  referrals_referred_client_id_unique: REFERRAL_MESSAGES.alreadyReferred,
  referrals_lead_id_unique: REFERRAL_MESSAGES.leadAlreadyReferred,
};

function constraintNameOf(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  // postgres.js exposes `constraint_name`; other drivers use `constraint`.
  const candidate = (value as { constraint_name?: unknown; constraint?: unknown }).constraint_name
    ?? (value as { constraint?: unknown }).constraint;
  return typeof candidate === "string" ? candidate : undefined;
}

/**
 * Turns a database rejection of a referral write (check, unique or the cycle
 * trigger) into a ReferralError. Drizzle wraps driver errors, so the whole
 * `cause` chain is inspected. Returns null for anything else.
 */
export function referralErrorFromDatabase(error: unknown): ReferralError | null {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const name = constraintNameOf(current);
    if (name && Object.hasOwn(CONSTRAINT_MESSAGES, name)) return new ReferralError(CONSTRAINT_MESSAGES[name]);
    current = typeof current === "object" ? (current as { cause?: unknown }).cause : undefined;
  }
  return null;
}
