// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {} }));

import { automationEvents, galleries, shoots } from "@/db/schema";
import { createAutomationDeliveryGuard } from "@/domain/automation/guard";
import type { ClaimedDelivery } from "@/domain/automation/processor";

const shootId = "00000000-0000-4000-8000-00000000c101";
const galleryId = "00000000-0000-4000-8000-00000000c201";
// 2026-10-05 10:00 in Manaus.
const now = new Date("2026-10-05T14:00:00.000Z");

const delivery: ClaimedDelivery = {
  id: "00000000-0000-4000-8000-00000000c301",
  eventId: "00000000-0000-4000-8000-00000000c401",
  templateKey: "lembrete-d1",
  templateVersion: 1,
  recipient: "ana@example.test",
  templateData: {},
  attemptCount: 1,
  maxAttempts: 5,
};

type Row = Record<string, unknown>;

function fakeDatabase(rows: { event?: Row; shoot?: Row; gallery?: Row }) {
  const tables: unknown[] = [];
  const select = vi.fn(() => ({
    from: (table: unknown) => {
      tables.push(table);
      const row = table === automationEvents ? rows.event : table === shoots ? rows.shoot : table === galleries ? rows.gallery : undefined;
      return { where: () => ({ limit: vi.fn().mockResolvedValue(row ? [row] : []) }) };
    },
  }));
  return { database: { select } as unknown as Parameters<typeof createAutomationDeliveryGuard>[0], tables };
}

describe("createAutomationDeliveryGuard", () => {
  it("sends a D-1 reminder while the shoot is upcoming on the scheduled date", async () => {
    const { database, tables } = fakeDatabase({
      event: { eventType: "shoot.reminder_d1", entityId: shootId, payload: { shootId, kind: "d1", shootDate: "2026-10-06" } },
      shoot: { status: "preparacao", shootDate: "2026-10-06" },
    });

    await expect(createAutomationDeliveryGuard(database)(delivery, now)).resolves.toEqual({ send: true });
    expect(tables).toEqual([automationEvents, shoots]);
  });

  it("cancels reminders for cancelled, rescheduled or moved shoots", async () => {
    const event = { eventType: "shoot.reminder_d1", entityId: shootId, payload: { shootId, kind: "d1", shootDate: "2026-10-06" } };
    for (const shoot of [
      { status: "cancelado", shootDate: "2026-10-06" },
      { status: "reagendado", shootDate: "2026-10-06" },
      { status: "reserva", shootDate: "2026-10-20" },
    ]) {
      const { database } = fakeDatabase({ event, shoot });
      await expect(createAutomationDeliveryGuard(database)(delivery, now)).resolves.toMatchObject({ send: false });
    }
  });

  it("uses the studio calendar day: a D-7 sent after its window closed is cancelled", async () => {
    const { database } = fakeDatabase({
      event: { eventType: "shoot.reminder_d7", entityId: shootId, payload: { shootId, kind: "d7", shootDate: "2026-10-06" } },
      shoot: { status: "reserva", shootDate: "2026-10-06" },
    });

    await expect(createAutomationDeliveryGuard(database)(delivery, now)).resolves.toEqual({
      send: false,
      reason: "lembrete fora da janela",
    });
  });

  it("cancels a queued welcome when the reservation was cancelled", async () => {
    const event = { eventType: "shoot.confirmed", entityId: shootId, payload: { shootId } };
    const cancelled = fakeDatabase({ event, shoot: { status: "cancelado", shootDate: "2026-10-20" } });
    const live = fakeDatabase({ event, shoot: { status: "reserva", shootDate: "2026-10-20" } });

    await expect(createAutomationDeliveryGuard(cancelled.database)(delivery, now)).resolves.toMatchObject({ send: false });
    await expect(createAutomationDeliveryGuard(live.database)(delivery, now)).resolves.toEqual({ send: true });
  });

  it("only sends the Reveal notification while the gallery is published", async () => {
    const event = { eventType: "gallery.published", entityId: galleryId, payload: { galleryId, shootId } };
    const published = fakeDatabase({ event, gallery: { status: "published" } });
    const draft = fakeDatabase({ event, gallery: { status: "draft" } });

    await expect(createAutomationDeliveryGuard(published.database)(delivery, now)).resolves.toEqual({ send: true });
    expect(published.tables).toEqual([automationEvents, galleries]);
    await expect(createAutomationDeliveryGuard(draft.database)(delivery, now)).resolves.toMatchObject({ send: false });
  });

  it("sends events without a rule unchanged and cancels orphan deliveries", async () => {
    const other = fakeDatabase({ event: { eventType: "test.enqueued", entityId: shootId, payload: {} } });
    const orphan = fakeDatabase({});

    await expect(createAutomationDeliveryGuard(other.database)(delivery, now)).resolves.toEqual({ send: true });
    expect(other.tables).toEqual([automationEvents]);
    await expect(createAutomationDeliveryGuard(orphan.database)(delivery, now)).resolves.toMatchObject({ send: false });
  });
});
