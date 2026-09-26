// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {} }));

import { automationEvents, notificationDeliveries } from "@/db/schema";
import {
  AutomationEventKeyConflictError,
  enqueueAutomationEvent,
  type EnqueueAutomationEventInput,
} from "@/domain/automation/events";
import { EmailTemplateDataError } from "@/domain/automation/templates/define";
import { UnknownEmailTemplateError } from "@/domain/automation/templates/registry";

const shootId = "00000000-0000-4000-8000-000000000101";
const eventId = "00000000-0000-4000-8000-000000000201";

const baseInput: EnqueueAutomationEventInput = {
  eventType: "shoot.confirmed",
  entityType: "shoot",
  entityId: shootId,
  idempotencyKey: `shoot.confirmed:${shootId}`,
  payload: { shootId },
  deliveries: [{ templateKey: "boas-vindas", recipient: "  Ana@Example.TEST ", data: { firstName: " Ana " } }],
};

type Row = Record<string, unknown>;

function createWriter() {
  const state = {
    eventInsertRows: [] as Row[],
    deliveryInsertRows: [] as Row[],
    existingEvent: [] as Row[],
    existingDeliveries: [] as Row[],
    eventValues: vi.fn(),
    deliveryValues: vi.fn(),
    conflictTargets: [] as unknown[],
  };

  const insert = vi.fn((table: unknown) => ({
    values: (values: unknown) => {
      const isEvent = table === automationEvents;
      (isEvent ? state.eventValues : state.deliveryValues)(values);
      return {
        onConflictDoNothing: (options: { target: unknown }) => {
          state.conflictTargets.push(options.target);
          return {
            returning: vi.fn().mockImplementation(async () => (isEvent ? state.eventInsertRows : state.deliveryInsertRows)),
          };
        },
      };
    },
  }));

  const select = vi.fn(() => ({
    from: (table: unknown) => ({
      where: () => {
        const rows = table === automationEvents ? state.existingEvent : state.existingDeliveries;
        return Object.assign(Promise.resolve(rows), { limit: vi.fn().mockResolvedValue(rows) });
      },
    }),
  }));

  return { writer: { insert, select } as unknown as Parameters<typeof enqueueAutomationEvent>[1], insert, select, state };
}

describe("enqueueAutomationEvent", () => {
  let fake: ReturnType<typeof createWriter>;

  beforeEach(() => {
    fake = createWriter();
  });

  it("persists the event and one pending delivery per recipient through the caller's writer", async () => {
    fake.state.eventInsertRows = [{ id: eventId, ...baseInput }];
    fake.state.deliveryInsertRows = [{ id: "d1", eventId, status: "pending" }];

    const result = await enqueueAutomationEvent(baseInput, fake.writer);

    expect(result).toMatchObject({ created: true, event: { id: eventId }, deliveries: [{ id: "d1" }] });
    expect(fake.state.eventValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "shoot.confirmed",
        entityType: "shoot",
        entityId: shootId,
        idempotencyKey: `shoot.confirmed:${shootId}`,
        payload: { shootId },
      }),
    );
    expect(fake.state.deliveryValues).toHaveBeenCalledWith([
      expect.objectContaining({
        eventId,
        channel: "email",
        templateKey: "boas-vindas",
        templateVersion: 1,
        recipient: "ana@example.test",
        templateData: { firstName: "Ana" },
        maxAttempts: 5,
      }),
    ]);
    expect(fake.state.conflictTargets[0]).toBe(automationEvents.idempotencyKey);
    expect(fake.state.conflictTargets[1]).toEqual([
      notificationDeliveries.eventId,
      notificationDeliveries.templateKey,
      notificationDeliveries.recipient,
    ]);
    expect(fake.select).not.toHaveBeenCalled();
  });

  it("dedupes the same template/recipient and honours a scheduled send time", async () => {
    const sendAt = new Date("2030-05-03T12:00:00.000Z");
    fake.state.eventInsertRows = [{ id: eventId }];

    await enqueueAutomationEvent(
      {
        ...baseInput,
        deliveries: [
          { templateKey: "boas-vindas", recipient: "ana@example.test", data: { firstName: "Ana" }, sendAt },
          { templateKey: "boas-vindas", recipient: "ANA@example.test", data: { firstName: "Ana" }, sendAt },
        ],
      },
      fake.writer,
    );

    const values = fake.state.deliveryValues.mock.calls[0][0] as Row[];
    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({ nextAttemptAt: sendAt });
  });

  it("returns the existing event and deliveries on replay without inserting deliveries", async () => {
    fake.state.eventInsertRows = [];
    fake.state.existingEvent = [{ id: eventId, eventType: "shoot.confirmed", entityType: "shoot", entityId: shootId }];
    fake.state.existingDeliveries = [{ id: "d1", eventId, status: "sent" }];

    const result = await enqueueAutomationEvent(baseInput, fake.writer);

    expect(result).toEqual({
      created: false,
      event: fake.state.existingEvent[0],
      deliveries: fake.state.existingDeliveries,
    });
    expect(fake.state.deliveryValues).not.toHaveBeenCalled();
  });

  it("refuses an idempotency key reused for a different event", async () => {
    fake.state.eventInsertRows = [];
    fake.state.existingEvent = [{ id: eventId, eventType: "gallery.published", entityType: "gallery", entityId: shootId }];

    await expect(enqueueAutomationEvent(baseInput, fake.writer)).rejects.toThrow(AutomationEventKeyConflictError);
  });

  it("validates templates and data before writing anything", async () => {
    await expect(
      enqueueAutomationEvent({ ...baseInput, deliveries: [{ templateKey: "nao-existe", recipient: "a@b.test", data: {} }] }, fake.writer),
    ).rejects.toThrow(UnknownEmailTemplateError);
    await expect(
      enqueueAutomationEvent({ ...baseInput, deliveries: [{ templateKey: "boas-vindas", recipient: "a@b.test", data: {} }] }, fake.writer),
    ).rejects.toThrow(EmailTemplateDataError);
    await expect(
      enqueueAutomationEvent({ ...baseInput, deliveries: [{ templateKey: "boas-vindas", recipient: "não é e-mail", data: { firstName: "Ana" } }] }, fake.writer),
    ).rejects.toThrow();
    await expect(enqueueAutomationEvent({ ...baseInput, entityId: "not-a-uuid" }, fake.writer)).rejects.toThrow();
    await expect(enqueueAutomationEvent({ ...baseInput, eventType: "Shoot Confirmed" }, fake.writer)).rejects.toThrow();

    expect(fake.insert).not.toHaveBeenCalled();
  });
});
