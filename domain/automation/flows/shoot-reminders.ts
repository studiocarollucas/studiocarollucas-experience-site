import "server-only";

import { and, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { automationEvents, clients, shoots } from "@/db/schema";
import { logger } from "@/lib/observability/logger";
import { reportError as reportToSentry, type ErrorReporter } from "@/lib/observability/report-error";
import { enqueueAutomationEvent, type EnqueueAutomationEventInput } from "../events";
import { absoluteSiteUrl } from "../links";
import { firstNameOf, normalizeRecipient } from "../recipients";
import { sanitizeDeliveryError } from "../sanitize";
import { addCivilDays, studioDate, studioWallTimeToInstant } from "../studio-time";
import {
  REMINDER_LOOKAHEAD_DAYS,
  REMINDER_SEND_TIME,
  reminderDueForShoot,
  reminderIdempotencyKey,
  reminderRules,
  toTemplateTime,
  UPCOMING_SHOOT_STATUSES,
  type ReminderKind,
} from "./rules";

export type ReminderShootRow = {
  shootId: string;
  shootDate: string;
  startTime: string | null;
  status: string;
  portalEnabled: boolean;
  createdAt: Date;
  clientName: string;
  clientEmail: string | null;
};

export type PlannedReminder = {
  shootId: string;
  kind: ReminderKind;
  input: EnqueueAutomationEventInput;
};

export type ReminderPlan = {
  reminders: PlannedReminder[];
  notDue: number;
  noEmail: number;
};

/**
 * Pure: decides which shoots get which reminder today (studio calendar) and
 * builds the enqueue input. Only first name, date/time and portal links reach
 * the template; the event payload holds IDs and the scheduled date.
 */
export function planShootReminders(rows: ReminderShootRow[], { now }: { now: Date }): ReminderPlan {
  const today = studioDate(now);
  const localSendAt = studioWallTimeToInstant(today, REMINDER_SEND_TIME);
  const sendAt = localSendAt > now ? localSendAt : undefined;
  const plan: ReminderPlan = { reminders: [], notDue: 0, noEmail: 0 };

  for (const row of rows) {
    const kind = reminderDueForShoot(row, today);
    if (!kind) {
      plan.notDue += 1;
      continue;
    }
    const recipient = normalizeRecipient(row.clientEmail);
    if (!recipient) {
      plan.noEmail += 1;
      continue;
    }

    const rule = reminderRules[kind];
    const firstName = firstNameOf(row.clientName);
    const startTime = toTemplateTime(row.startTime);
    const linkField = kind === "d7" ? "checklistUrl" : "shootUrl";
    plan.reminders.push({
      shootId: row.shootId,
      kind,
      input: {
        eventType: rule.eventType,
        entityType: "shoot",
        entityId: row.shootId,
        idempotencyKey: reminderIdempotencyKey(kind, row.shootId, row.shootDate),
        payload: { shootId: row.shootId, kind, shootDate: row.shootDate },
        occurredAt: now,
        deliveries: [
          {
            templateKey: rule.templateKey,
            recipient,
            data: {
              ...(firstName ? { firstName } : {}),
              shootDate: row.shootDate,
              ...(startTime ? { startTime } : {}),
              ...(row.portalEnabled ? { [linkField]: absoluteSiteUrl(rule.portalPath) } : {}),
            },
            ...(sendAt ? { sendAt } : {}),
          },
        ],
      },
    });
  }

  return plan;
}

export type ReminderScheduleSummary = {
  today: string;
  candidates: number;
  enqueued: number;
  alreadyQueued: number;
  notDue: number;
  noEmail: number;
  errors: number;
};

type ScheduleShootRemindersOptions = {
  now?: Date;
  database?: Pick<typeof db, "select" | "transaction">;
  reportError?: ErrorReporter;
};

/**
 * SCL-702 scheduler step (run by /api/cron/shoot-reminders). Selects upcoming
 * shoots inside the widest reminder window, plans today's D-7/D-1 and enqueues
 * each one in its own transaction. Safe to run many times a day: keys are per
 * shoot + kind + date, and keys already stored are skipped before writing.
 * Cancelled/rescheduled shoots are never selected; the send-time guard covers
 * changes that happen after enqueueing.
 */
export async function scheduleShootReminders(options: ScheduleShootRemindersOptions = {}): Promise<ReminderScheduleSummary> {
  const now = options.now ?? new Date();
  const database = options.database ?? db;
  const reportError = options.reportError ?? reportToSentry;
  const today = studioDate(now);

  const rows = await database
    .select({
      shootId: shoots.id,
      shootDate: shoots.shootDate,
      startTime: shoots.startTime,
      status: shoots.status,
      portalEnabled: shoots.portalEnabled,
      createdAt: shoots.createdAt,
      clientName: clients.name,
      clientEmail: clients.email,
    })
    .from(shoots)
    .innerJoin(clients, eq(clients.id, shoots.clientId))
    .where(
      and(
        inArray(shoots.status, [...UPCOMING_SHOOT_STATUSES]),
        gte(shoots.shootDate, addCivilDays(today, 1)),
        lte(shoots.shootDate, addCivilDays(today, REMINDER_LOOKAHEAD_DAYS)),
        isNotNull(clients.email),
      ),
    );

  const plan = planShootReminders(rows, { now });
  const summary: ReminderScheduleSummary = {
    today,
    candidates: rows.length,
    enqueued: 0,
    alreadyQueued: 0,
    notDue: plan.notDue,
    noEmail: plan.noEmail,
    errors: 0,
  };
  if (plan.reminders.length === 0) return summary;

  const existing = await database
    .select({ idempotencyKey: automationEvents.idempotencyKey })
    .from(automationEvents)
    .where(
      inArray(
        automationEvents.idempotencyKey,
        plan.reminders.map((reminder) => reminder.input.idempotencyKey),
      ),
    );
  const existingKeys = new Set(existing.map((row) => row.idempotencyKey));

  for (const reminder of plan.reminders) {
    if (existingKeys.has(reminder.input.idempotencyKey)) {
      summary.alreadyQueued += 1;
      continue;
    }
    try {
      const result = await database.transaction((tx) => enqueueAutomationEvent(reminder.input, tx));
      if (result.created) summary.enqueued += 1;
      else summary.alreadyQueued += 1;
    } catch (error) {
      summary.errors += 1;
      const message = sanitizeDeliveryError(error);
      logger.error("shoot reminder enqueue failed", { shootId: reminder.shootId, kind: reminder.kind, error: message });
      reportError(new Error(`falha ao agendar lembrete de ensaio: ${message}`), {
        tags: { area: "email-automation", reason: "reminder-schedule", kind: reminder.kind },
        extra: { shootId: reminder.shootId },
      });
    }
  }

  return summary;
}
