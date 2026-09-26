// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {} }));

import { automationEvents, shoots } from "@/db/schema";
import { enqueueGalleryPublished } from "@/domain/automation/flows/gallery-published";
import { renderEmailTemplate } from "@/domain/automation/templates/registry";

const galleryId = "00000000-0000-4000-8000-00000000b101";
const shootId = "00000000-0000-4000-8000-00000000b102";
const eventId = "00000000-0000-4000-8000-00000000b103";
const now = new Date("2026-10-20T15:00:00.000Z");
const published = { id: galleryId, shootId, status: "published" as const };

type Row = Record<string, unknown>;

function fakeWriter(client: Row | undefined, options: { replay?: boolean } = {}) {
  const eventValues = vi.fn();
  const deliveryValues = vi.fn();
  const select = vi.fn(() => ({
    from: (table: unknown) => {
      if (table === shoots) {
        const rows = client ? [client] : [];
        return { innerJoin: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue(rows) }) }) };
      }
      const rows = table === automationEvents ? [{ id: eventId, eventType: "gallery.published", entityType: "gallery", entityId: galleryId }] : [];
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
    writer: { select, insert } as unknown as Parameters<typeof enqueueGalleryPublished>[1],
    select,
    insert,
    eventValues,
    deliveryValues,
  };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://studiocarollucas.com.br");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("enqueueGalleryPublished (SCL-703)", () => {
  it("enqueues one gallery.published event per gallery with an authenticated Reveal link", async () => {
    const fake = fakeWriter({ name: "Ana Souza", email: "ana@example.test" });

    await expect(enqueueGalleryPublished({ gallery: published, photoCount: 12 }, fake.writer, now)).resolves.toEqual({
      status: "enqueued",
      eventId,
    });

    expect(fake.eventValues).toHaveBeenCalledWith({
      eventType: "gallery.published",
      entityType: "gallery",
      entityId: galleryId,
      idempotencyKey: `gallery.published:${galleryId}`,
      payload: { galleryId, shootId },
      occurredAt: now,
    });
    const [delivery] = fake.deliveryValues.mock.calls[0][0] as Row[];
    expect(delivery).toMatchObject({
      templateKey: "galeria-publicada",
      templateVersion: 1,
      recipient: "ana@example.test",
      templateData: { firstName: "Ana", revealUrl: "https://studiocarollucas.com.br/minha-experiencia/reveal" },
    });
    // The link is the login-protected portal page: no tokens, no signed Storage URLs.
    const email = renderEmailTemplate("galeria-publicada", 1, delivery.templateData);
    expect(email.html).not.toMatch(/token|signed|supabase/i);
  });

  it("does not send twice when the same gallery is published again", async () => {
    const fake = fakeWriter({ name: "Ana", email: "ana@example.test" }, { replay: true });

    await expect(enqueueGalleryPublished({ gallery: published, photoCount: 12 }, fake.writer, now)).resolves.toEqual({
      status: "replayed",
      eventId,
    });
    expect(fake.deliveryValues).not.toHaveBeenCalled();
  });

  it("never communicates a draft or an empty gallery", async () => {
    const draft = fakeWriter({ name: "Ana", email: "ana@example.test" });
    await expect(
      enqueueGalleryPublished({ gallery: { ...published, status: "draft" }, photoCount: 12 }, draft.writer, now),
    ).resolves.toEqual({ status: "skipped", reason: "not_published" });
    expect(draft.select).not.toHaveBeenCalled();

    const empty = fakeWriter({ name: "Ana", email: "ana@example.test" });
    await expect(enqueueGalleryPublished({ gallery: published, photoCount: 0 }, empty.writer, now)).resolves.toEqual({
      status: "skipped",
      reason: "no_photos",
    });
    expect(empty.insert).not.toHaveBeenCalled();
  });

  it("skips clients without a usable email instead of failing the publication", async () => {
    const fake = fakeWriter({ name: "Ana", email: null });
    await expect(enqueueGalleryPublished({ gallery: published, photoCount: 3 }, fake.writer, now)).resolves.toEqual({
      status: "skipped",
      reason: "no_email",
    });
    expect(fake.insert).not.toHaveBeenCalled();
  });
});
