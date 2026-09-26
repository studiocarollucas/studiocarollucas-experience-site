// Client-safe (no db imports): actions map UpsellError to an actionable message
// without pulling the database graph.

/** A rule violation whose message (pt-BR) can be shown to staff or to the client as is. */
export class UpsellError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpsellError";
  }
}

// Constraint (and trigger) names from migration 0052.
const CONSTRAINT_MESSAGES: Record<string, string> = {
  upsell_products_name_unique: "Já existe um produto com este nome.",
  upsell_orders_consistent: "O pedido não corresponde à galeria desta cliente.",
  payments_upsell_order_fk: "O pagamento não corresponde ao ensaio do pedido.",
};

function constraintNameOf(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  // postgres.js exposes `constraint_name`; other drivers use `constraint`.
  const candidate =
    (value as { constraint_name?: unknown }).constraint_name ?? (value as { constraint?: unknown }).constraint;
  return typeof candidate === "string" ? candidate : undefined;
}

/**
 * Turns a database rejection of an upsell write into an UpsellError. Drizzle
 * wraps driver errors, so the `cause` chain is inspected. Null for anything else.
 */
export function upsellErrorFromDatabase(error: unknown): UpsellError | null {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const name = constraintNameOf(current);
    if (name && Object.hasOwn(CONSTRAINT_MESSAGES, name)) return new UpsellError(CONSTRAINT_MESSAGES[name]);
    current = typeof current === "object" ? (current as { cause?: unknown }).cause : undefined;
  }
  return null;
}
