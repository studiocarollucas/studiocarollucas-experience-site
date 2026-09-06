import { toCents, fromCents } from "@/lib/money";

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Formats a decimal string (Postgres `numeric`) as Brazilian Real. Parsing runs
 * through lib/money's fixed-point helpers — never parseFloat — so 20+ payments
 * never compound a rounding error.
 */
export function formatBRL(value: string): string {
  const normalized = fromCents(toCents(value));
  const negative = normalized.startsWith("-");
  const [whole, cents] = normalized.replace("-", "").split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}R$ ${grouped},${cents}`;
}

/** Postgres `date` string ("YYYY-MM-DD") → "18 out 2026". Parsed by parts to avoid
 *  the UTC-midnight-shifts-a-day bug `new Date("2026-10-18")` causes in negative
 *  timezones. */
export function formatShootDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS_PT[m - 1]} ${y}`;
}

/** For read-only display of a `timestamp` value. */
export function formatDateTime(iso: string): string {
  const date = formatShootDate(iso);
  const time = iso.slice(11, 16);
  return time ? `${date} · ${time}` : date;
}

/** Normalizes any ISO date/datetime to the "YYYY-MM-DD" an <input type="date"> wants. */
export function formatDateInput(iso: string): string {
  return iso.slice(0, 10);
}
