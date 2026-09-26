import { z } from "zod";
import type { ShootStatus } from "@/domain/shoots/status";
import { portalPaths } from "../links";
import { addCivilDays, daysUntilShoot, studioDate } from "../studio-time";

// Pure business rules shared by the flows that enqueue (SCL-701/702/703) and
// by the send-time eligibility guard (domain/automation/guard.ts).

export const SHOOT_WELCOME_EVENT_TYPE = "shoot.confirmed";
export const GALLERY_PUBLISHED_EVENT_TYPE = "gallery.published";

export const WELCOME_TEMPLATE_KEY = "boas-vindas";
export const GALLERY_PUBLISHED_TEMPLATE_KEY = "galeria-publicada";

export type GuardDecision = { send: true } | { send: false; reason: string };

const SEND: GuardDecision = { send: true };

export function shootWelcomeIdempotencyKey(shootId: string): string {
  return `${SHOOT_WELCOME_EVENT_TYPE}:${shootId.toLowerCase()}`;
}

export function galleryPublishedIdempotencyKey(galleryId: string): string {
  return `${GALLERY_PUBLISHED_EVENT_TYPE}:${galleryId.toLowerCase()}`;
}

/**
 * "HH:mm[:ss]" from Postgres `time` → "HH:mm" for templates. Anything the
 * template would reject (e.g. Postgres' "24:00") is dropped, so a stray value
 * can never abort the business transaction that enqueues the email.
 */
export function toTemplateTime(startTime: string | null | undefined): string | undefined {
  return startTime && /^([01]\d|2[0-3]):[0-5]\d/.test(startTime) ? startTime.slice(0, 5) : undefined;
}

// ---------------------------------------------------------------------------
// SCL-701 — welcome on confirmed reservation

/** Statuses of a reservation that is confirmed and has not happened yet. */
export const UPCOMING_SHOOT_STATUSES = ["reserva", "preparacao"] as const satisfies readonly ShootStatus[];

function isUpcomingStatus(status: string): boolean {
  return (UPCOMING_SHOOT_STATUSES as readonly string[]).includes(status);
}

/**
 * A welcome belongs to a live, upcoming reservation: registering a historical
 * or already-cancelled shoot must not greet the client.
 */
export function isWelcomeEligible(shoot: { status: string; shootDate: string }, now: Date): boolean {
  return isUpcomingStatus(shoot.status) && shoot.shootDate >= studioDate(now);
}

export function decideShootWelcomeDelivery(shoot: { status: string } | null): GuardDecision {
  if (!shoot) return { send: false, reason: "ensaio inexistente" };
  if (shoot.status === "cancelado") return { send: false, reason: "ensaio cancelado" };
  return SEND;
}

// ---------------------------------------------------------------------------
// SCL-702 — D-7 / D-1 reminders

export const reminderKinds = ["d7", "d1"] as const;
export type ReminderKind = (typeof reminderKinds)[number];

type ReminderRule = {
  eventType: string;
  templateKey: string;
  /** Inclusive window, in studio calendar days before the shoot. */
  minDaysBefore: number;
  maxDaysBefore: number;
  portalPath: string;
};

export const reminderRules: Record<ReminderKind, ReminderRule> = {
  // Nominally 7 days before; up to 2 days late if the scheduler missed a day.
  d7: {
    eventType: "shoot.reminder_d7",
    templateKey: "lembrete-d7",
    minDaysBefore: 2,
    maxDaysBefore: 7,
    portalPath: portalPaths.checklist,
  },
  // "Amanhã" is only true on the day before — never late.
  d1: {
    eventType: "shoot.reminder_d1",
    templateKey: "lembrete-d1",
    minDaysBefore: 1,
    maxDaysBefore: 1,
    portalPath: portalPaths.shoot,
  },
};

/** Earliest local send time of a reminder, so nobody is emailed at midnight. */
export const REMINDER_SEND_TIME = "09:00";

/** Widest scheduler window, in days from the studio's today. */
export const REMINDER_LOOKAHEAD_DAYS = Math.max(...reminderKinds.map((kind) => reminderRules[kind].maxDaysBefore));

export function reminderKindForEventType(eventType: string): ReminderKind | null {
  return reminderKinds.find((kind) => reminderRules[kind].eventType === eventType) ?? null;
}

/** Key per shoot + kind + scheduled date: a new date yields a new reminder. */
export function reminderIdempotencyKey(kind: ReminderKind, shootId: string, shootDate: string): string {
  return `${reminderRules[kind].eventType}:${shootId.toLowerCase()}:${shootDate}`;
}

/** Which reminder (if any) is due today for a shoot on `shootDate`. Windows are disjoint. */
export function dueReminderKind(shootDate: string, today: string): ReminderKind | null {
  const daysBefore = daysUntilShoot(shootDate, today);
  return (
    reminderKinds.find(
      (kind) => daysBefore >= reminderRules[kind].minDaysBefore && daysBefore <= reminderRules[kind].maxDaysBefore,
    ) ?? null
  );
}

export type ReminderCandidate = {
  status: string;
  shootDate: string;
  createdAt: Date;
};

/**
 * Enqueue-time rule. D-7 additionally requires the reservation to exist before
 * its D-7 day: a booking made closer than that just received the welcome.
 */
export function reminderDueForShoot(shoot: ReminderCandidate, today: string): ReminderKind | null {
  if (!isUpcomingStatus(shoot.status)) return null;
  const kind = dueReminderKind(shoot.shootDate, today);
  if (kind === "d7") {
    const reminderDay = addCivilDays(shoot.shootDate, -reminderRules.d7.maxDaysBefore);
    if (studioDate(shoot.createdAt) >= reminderDay) return null;
  }
  return kind;
}

const reminderPayloadSchema = z.object({ shootDate: z.iso.date() });

/**
 * Send-time rule: the shoot must still be upcoming, on the date the reminder
 * was scheduled for, and inside that reminder's window.
 */
export function decideShootReminderDelivery(input: {
  kind: ReminderKind;
  payload: unknown;
  shoot: { status: string; shootDate: string } | null;
  today: string;
}): GuardDecision {
  const payload = reminderPayloadSchema.safeParse(input.payload);
  if (!payload.success) return { send: false, reason: "lembrete sem data agendada" };
  if (!input.shoot) return { send: false, reason: "ensaio inexistente" };
  if (!isUpcomingStatus(input.shoot.status)) return { send: false, reason: "ensaio cancelado ou reagendado" };
  if (input.shoot.shootDate !== payload.data.shootDate) return { send: false, reason: "data do ensaio alterada" };
  if (dueReminderKind(input.shoot.shootDate, input.today) !== input.kind) {
    return { send: false, reason: "lembrete fora da janela" };
  }
  return SEND;
}

// ---------------------------------------------------------------------------
// SCL-703 — Reveal / gallery published

export function decideGalleryPublishedDelivery(gallery: { status: string } | null): GuardDecision {
  if (!gallery) return { send: false, reason: "galeria inexistente" };
  if (gallery.status !== "published") return { send: false, reason: "galeria não publicada" };
  return SEND;
}
