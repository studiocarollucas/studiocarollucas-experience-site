// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ enqueueAutomationEvent: vi.fn() }));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/domain/automation/events", () => ({ enqueueAutomationEvent: mocks.enqueueAutomationEvent }));

import { automationEvents, shoots } from "@/db/schema";
import {
  planShootReminders,
  scheduleShootReminders,
  type ReminderShootRow,
} from "@/domain/automation/flows/shoot-reminders";
import { getLatestEmailTemplate } from "@/domain/automation/templates/registry";

// 2026-10-05 01:00 in Manaus — before the 09:00 local send time.
const earlyNow = new Date("2026-10-05T05:00:00.000Z");
// 2026-10-05 10:00 in Manaus — after it.
const lateNow = new Date("2026-10-05T14:00:00.000Z");
const sendAt = new Date("2026-10-05T13:00:00.000Z");
const createdLongAgo = new Date("2026-08-01T12:00:00.000Z");

function row(overrides: Partial<ReminderShootRow>): ReminderShootRow {
  return {
    shootId: "00000000-0000-4000-8000-00000000f101",
    shootDate: "2026-10-12",
    startTime: "15:00:00",
    status: "reserva",
    portalEnabled: true,
    createdAt: createdLongAgo,
    clientName: "Ana Beatriz",
    clientEmail: "Ana@Example.TEST",
    ...overrides,
  };
}

const d7Shoot = row({ shootId: "00000000-0000-4000-8000-00000000f107", shootDate: "2026-10-12" });
const d1Shoot = row({
  shootId: "00000000-0000-4000-8000-00000000f101",
  shootDate: "2026-10-06",
  startTime: null,
  status: "preparacao",
  clientEmail: "bia@example.test",
  clientName: "Bia",
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://studiocarollucas.com.br");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("planShootReminders (SCL-702)", () => {
  it("plans D-7 and D-1 keyed by shoot, kind and date, due at 09:00 in Manaus", () => {
    const plan = planShootReminders([d7Shoot, d1Shoot], { now: earlyNow });

    expect(plan).toMatchObject({ notDue: 0, noEmail: 0 });
    expect(plan.reminders.map((reminder) => reminder.input)).toEqual([
      {
        eventType: "shoot.reminder_d7",
        entityType: "shoot",
        entityId: d7Shoot.shootId,
        idempotencyKey: `shoot.reminder_d7:${d7Shoot.shootId}:2026-10-12`,
        payload: { shootId: d7Shoot.shootId, kind: "d7", shootDate: "2026-10-12" },
        occurredAt: earlyNow,
        deliveries: [
          {
            templateKey: "lembrete-d7",
            recipient: "ana@example.test",
            data: {
              firstName: "Ana",
              shootDate: "2026-10-12",
              startTime: "15:00",
              checklistUrl: "https://studiocarollucas.com.br/minha-experiencia/checklist",
            },
            sendAt,
          },
        ],
      },
      {
        eventType: "shoot.reminder_d1",
        entityType: "shoot",
        entityId: d1Shoot.shootId,
        idempotencyKey: `shoot.reminder_d1:${d1Shoot.shootId}:2026-10-06`,
        payload: { shootId: d1Shoot.shootId, kind: "d1", shootDate: "2026-10-06" },
        occurredAt: earlyNow,
        deliveries: [
          {
            templateKey: "lembrete-d1",
            recipient: "bia@example.test",
            data: {
              firstName: "Bia",
              shootDate: "2026-10-06",
              shootUrl: "https://studiocarollucas.com.br/minha-experiencia/ensaio",
            },
            sendAt,
          },
        ],
      },
    ]);
  });

  it("builds data every reminder template accepts", () => {
    const plan = planShootReminders([d7Shoot, d1Shoot, row({ portalEnabled: false })], { now: earlyNow });
    for (const { input } of plan.reminders) {
      for (const delivery of input.deliveries) {
        expect(() => getLatestEmailTemplate(delivery.templateKey).parse(delivery.data)).not.toThrow();
      }
    }
  });

  it("sends right away after 09:00 and leaves out portal links when the portal is disabled", () => {
    const [reminder] = planShootReminders([row({ portalEnabled: false })], { now: lateNow }).reminders;
    const [delivery] = reminder.input.deliveries;

    expect(delivery).not.toHaveProperty("sendAt");
    expect(delivery.data).toEqual({ firstName: "Ana", shootDate: "2026-10-12", startTime: "15:00" });
  });

  it("skips shoots outside the window, cancelled/rescheduled, booked inside the week or without email", () => {
    const plan = planShootReminders(
      [
        row({ shootDate: "2026-10-13" }),
        row({ shootDate: "2026-10-05" }),
        row({ status: "cancelado" }),
        row({ status: "reagendado", shootDate: "2026-10-06" }),
        row({ createdAt: new Date("2026-10-05T12:00:00.000Z") }),
        row({ clientEmail: null }),
        row({ clientEmail: "invalido" }),
      ],
      { now: earlyNow },
    );

    expect(plan).toEqual({ reminders: [], notDue: 5, noEmail: 2 });
  });

  it("gives a rescheduled date a new idempotency key", () => {
    const original = planShootReminders([row({ shootDate: "2026-10-12" })], { now: earlyNow }).reminders[0];
    const moved = planShootReminders([row({ shootDate: "2026-10-10" })], { now: earlyNow }).reminders[0];
    expect(moved.input.idempotencyKey).not.toBe(original.input.idempotencyKey);
  });
});

function fakeDatabase(options: { rows: ReminderShootRow[]; existingKeys?: string[] }) {
  const tx = { kind: "tx" };
  const whereCalls: unknown[] = [];
  const select = vi.fn(() => ({
    from: (table: unknown) => {
      if (table === shoots) {
        return {
          innerJoin: () => ({
            where: (condition: unknown) => {
              whereCalls.push(condition);
              return Promise.resolve(options.rows);
            },
          }),
        };
      }
      if (table === automationEvents) {
        return {
          where: () => Promise.resolve((options.existingKeys ?? []).map((idempotencyKey) => ({ idempotencyKey }))),
        };
      }
      throw new Error("unexpected table");
    },
  }));
  const transaction = vi.fn(async (operation: (transaction: unknown) => Promise<unknown>) => operation(tx));
  return {
    database: { select, transaction } as unknown as NonNullable<Parameters<typeof scheduleShootReminders>[0]>["database"],
    select,
    transaction,
    tx,
    whereCalls,
  };
}

describe("scheduleShootReminders (SCL-702)", () => {
  it("enqueues each due reminder in its own transaction and reports counters only", async () => {
    const fake = fakeDatabase({ rows: [d7Shoot, d1Shoot, row({ clientEmail: "x" })] });
    mocks.enqueueAutomationEvent.mockResolvedValue({ created: true });

    await expect(scheduleShootReminders({ now: earlyNow, database: fake.database, reportError: vi.fn() })).resolves.toEqual({
      today: "2026-10-05",
      candidates: 3,
      enqueued: 2,
      alreadyQueued: 0,
      notDue: 0,
      noEmail: 1,
      errors: 0,
    });
    expect(fake.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.enqueueAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: `shoot.reminder_d7:${d7Shoot.shootId}:2026-10-12` }),
      fake.tx,
    );
    expect(mocks.enqueueAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: `shoot.reminder_d1:${d1Shoot.shootId}:2026-10-06` }),
      fake.tx,
    );
  });

  it("skips keys already stored so repeated runs never write twice", async () => {
    const fake = fakeDatabase({
      rows: [d7Shoot, d1Shoot],
      existingKeys: [`shoot.reminder_d7:${d7Shoot.shootId}:2026-10-12`],
    });
    mocks.enqueueAutomationEvent.mockResolvedValue({ created: false });

    await expect(scheduleShootReminders({ now: earlyNow, database: fake.database, reportError: vi.fn() })).resolves.toMatchObject({
      enqueued: 0,
      alreadyQueued: 2,
    });
    expect(mocks.enqueueAutomationEvent).toHaveBeenCalledOnce();
  });

  it("does not touch the outbox when nothing is due", async () => {
    const fake = fakeDatabase({ rows: [] });

    await expect(scheduleShootReminders({ now: earlyNow, database: fake.database })).resolves.toMatchObject({
      candidates: 0,
      enqueued: 0,
    });
    expect(fake.select).toHaveBeenCalledOnce();
    expect(fake.transaction).not.toHaveBeenCalled();
  });

  it("keeps going when one reminder fails and reports it without personal data", async () => {
    const fake = fakeDatabase({ rows: [d7Shoot, d1Shoot] });
    mocks.enqueueAutomationEvent
      .mockRejectedValueOnce(new Error("insert failed for ana@example.test"))
      .mockResolvedValueOnce({ created: true });
    const reportError = vi.fn();

    await expect(scheduleShootReminders({ now: earlyNow, database: fake.database, reportError })).resolves.toMatchObject({
      enqueued: 1,
      errors: 1,
    });
    expect(reportError).toHaveBeenCalledOnce();
    const [reported, context] = reportError.mock.calls[0];
    expect((reported as Error).message).not.toContain("ana@example.test");
    expect(context).toMatchObject({ tags: { area: "email-automation", kind: "d7" }, extra: { shootId: d7Shoot.shootId } });
  });
});
