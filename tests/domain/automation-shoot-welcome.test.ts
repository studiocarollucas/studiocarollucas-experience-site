// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {} }));

import { automationEvents, clients } from "@/db/schema";
import { enqueueShootWelcome } from "@/domain/automation/flows/shoot-welcome";
import { renderEmailTemplate } from "@/domain/automation/templates/registry";

const shootId = "00000000-0000-4000-8000-00000000d101";
const clientId = "00000000-0000-4000-8000-00000000d102";
const eventId = "00000000-0000-4000-8000-00000000d103";
// 2026-10-01 11:00 in Manaus.
const now = new Date("2026-10-01T15:00:00.000Z");

const shoot = {
  id: shootId,
  clientId,
  status: "reserva" as const,
  shootDate: "2026-10-20",
  startTime: "15:00:00",
  portalEnabled: true,
};

type Row = Record<string, unknown>;

function fakeWriter(client: Row | undefined, options: { replay?: boolean } = {}) {
  const eventValues = vi.fn();
  const deliveryValues = vi.fn();
  const selectedTables: unknown[] = [];
  const select = vi.fn(() => ({
    from: (table: unknown) => {
      selectedTables.push(table);
      const rows =
        table === clients
          ? client
            ? [client]
            : []
          : table === automationEvents
            ? [{ id: eventId, eventType: "shoot.confirmed", entityType: "shoot", entityId: shootId }]
            : [];
      return { where: () => Object.assign(Promise.resolve(rows), { limit: vi.fn().mockResolvedValue(rows) }) };
    },
  }));
  const insert = vi.fn((table: unknown) => ({
    values: (values: unknown) => {
      const isEvent = table === automationEvents;
      (isEvent ? eventValues : deliveryValues)(values);
      return {
        onConflictDoNothing: () => ({
          returning: vi.fn().mockResolvedValue(isEvent ? (options.replay ? [] : [{ id: eventId }]) : [{ id: "d1" }]),
        }),
      };
    },
  }));
  return {
    writer: { select, insert } as unknown as Parameters<typeof enqueueShootWelcome>[1],
    insert,
    eventValues,
    deliveryValues,
    selectedTables,
  };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://studiocarollucas.com.br");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("enqueueShootWelcome (SCL-701)", () => {
  it("enqueues one shoot.confirmed event keyed by shoot with the v2 welcome and a portal CTA", async () => {
    const fake = fakeWriter({ name: "Ana Beatriz Souza", email: " Ana@Example.TEST " });

    await expect(enqueueShootWelcome(shoot, fake.writer, now)).resolves.toEqual({ status: "enqueued", eventId });

    expect(fake.eventValues).toHaveBeenCalledWith({
      eventType: "shoot.confirmed",
      entityType: "shoot",
      entityId: shootId,
      idempotencyKey: `shoot.confirmed:${shootId}`,
      payload: { shootId },
      occurredAt: now,
    });
    const [delivery] = fake.deliveryValues.mock.calls[0][0] as Row[];
    expect(delivery).toMatchObject({
      eventId,
      templateKey: "boas-vindas",
      templateVersion: 2,
      recipient: "ana@example.test",
      templateData: {
        firstName: "Ana",
        shootDate: "2026-10-20",
        startTime: "15:00",
        portalUrl: "https://studiocarollucas.com.br/minha-experiencia",
      },
    });

    // Only client-safe data reaches the template or the event.
    const stored = JSON.stringify([fake.eventValues.mock.calls, delivery.templateData]);
    for (const internal of ["agreedPrice", "notes", "Souza", "paymentStatus"]) expect(stored).not.toContain(internal);
    const email = renderEmailTemplate("boas-vindas", 2, delivery.templateData);
    expect(email.html).toContain('href="https://studiocarollucas.com.br/minha-experiencia"');
  });

  it("omits the portal CTA when the shoot's portal access is disabled", async () => {
    const fake = fakeWriter({ name: "Ana", email: "ana@example.test" });

    await enqueueShootWelcome({ ...shoot, portalEnabled: false, startTime: null }, fake.writer, now);

    const [delivery] = fake.deliveryValues.mock.calls[0][0] as Row[];
    expect(delivery.templateData).toEqual({ firstName: "Ana", shootDate: "2026-10-20" });
  });

  it("is a no-op replay when the shoot was already welcomed", async () => {
    const fake = fakeWriter({ name: "Ana", email: "ana@example.test" }, { replay: true });

    await expect(enqueueShootWelcome(shoot, fake.writer, now)).resolves.toEqual({ status: "replayed", eventId });
    expect(fake.deliveryValues).not.toHaveBeenCalled();
  });

  it("skips clients without a usable email instead of failing the reservation", async () => {
    for (const email of [null, "", "sem-arroba"]) {
      const fake = fakeWriter({ name: "Ana", email });
      await expect(enqueueShootWelcome(shoot, fake.writer, now)).resolves.toEqual({ status: "skipped", reason: "no_email" });
      expect(fake.insert).not.toHaveBeenCalled();
    }
    const missing = fakeWriter(undefined);
    await expect(enqueueShootWelcome(shoot, missing.writer, now)).resolves.toEqual({ status: "skipped", reason: "no_client" });
  });

  it("never welcomes historical, finished or cancelled shoots", async () => {
    for (const candidate of [
      { ...shoot, shootDate: "2026-09-30" },
      { ...shoot, status: "realizado" as const },
      { ...shoot, status: "cancelado" as const },
    ]) {
      const fake = fakeWriter({ name: "Ana", email: "ana@example.test" });
      await expect(enqueueShootWelcome(candidate, fake.writer, now)).resolves.toEqual({
        status: "skipped",
        reason: "not_upcoming",
      });
      expect(fake.selectedTables).toEqual([]);
      expect(fake.insert).not.toHaveBeenCalled();
    }
  });
});
