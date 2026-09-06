/**
 * Fixed-point money helpers for Postgres `numeric` values, which arrive as
 * decimal strings ("1234.50"). Arithmetic runs on integer cents — never
 * parseFloat — so summing 20+ payments never compounds a rounding error.
 *
 * This is the single source of the toCents/fromCents convention first written
 * privately inside domain/payments/balance.ts (Epic 1); that module now imports
 * from here instead of keeping its own copy.
 */

/** Decimal string (incl. a leading "-") → integer cents. */
export function toCents(value: string): number {
  const [whole, fraction = "0"] = value.split(".");
  const cents = `${fraction}00`.slice(0, 2);
  return Number(whole) * 100 + Number(cents) * (whole.startsWith("-") ? -1 : 1);
}

/** Integer cents → decimal string, sign preserved, always two fraction digits. */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

/** Sum of two decimal strings, returned as a decimal string. */
export function addDecimal(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b));
}

/** Sum of a list of decimal strings, returned as integer cents. */
export function sumCents(values: string[]): number {
  return values.reduce((total, value) => total + toCents(value), 0);
}
