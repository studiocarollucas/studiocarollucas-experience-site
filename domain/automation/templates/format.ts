import { z } from "zod";

// Shared template field schemas and pt-BR formatting. Changing a helper here
// changes the output of every version that uses it, so only add helpers —
// copy changes still belong in a new template version.

export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value: string) => /^https?:\/\//i.test(value), "URL precisa usar http(s)");

export const firstNameSchema = z.string().trim().min(1).max(60);

export const civilDateSchema = z.iso.date();

export const wallTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "horário HH:mm");

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "2026-10-12" → "segunda-feira, 12 de outubro" (a civil date, so no timezone shift). */
export function formatLongDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return longDateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

/** "segunda-feira, 12 de outubro, às 15:00" or just the date. */
export function formatShootMoment(date: string, time?: string): string {
  const longDate = formatLongDate(date);
  return time ? `${longDate}, às ${time}` : longDate;
}

export function greetingFor(firstName?: string): string {
  return firstName ? `Olá, ${firstName}!` : "Olá!";
}
