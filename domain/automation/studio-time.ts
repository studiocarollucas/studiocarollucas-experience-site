import { STUDIO_TIME_ZONE } from "@/domain/portal/countdown";

export { daysUntilShoot, studioDate } from "@/domain/portal/countdown";

const DAY_MS = 86_400_000;

function parseCivilDate(value: string): [number, number, number] {
  const [year, month, day] = value.split("-").map(Number);
  return [year, month, day];
}

/** Adds whole calendar days to a "YYYY-MM-DD" civil date (no timezone involved). */
export function addCivilDays(date: string, days: number): string {
  const [year, month, day] = parseCivilDate(date);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Offset (wall clock − UTC) of the studio timezone at a given instant, in ms. */
function studioOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const wallClock = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return wallClock - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The UTC instant of a wall-clock time ("HH:mm") on a civil date in the studio
 * timezone (America/Manaus), derived from Intl instead of a hard-coded offset.
 */
export function studioWallTimeToInstant(date: string, time: string): Date {
  const [year, month, day] = parseCivilDate(date);
  const [hour, minute] = time.split(":").map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = asIfUtc - studioOffsetMs(new Date(asIfUtc));
  // Second pass settles the rare case where the offset differs at the guess.
  return new Date(asIfUtc - studioOffsetMs(new Date(firstGuess)));
}
