// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decideGalleryPublishedDelivery,
  decideShootReminderDelivery,
  decideShootWelcomeDelivery,
  dueReminderKind,
  galleryPublishedIdempotencyKey,
  isWelcomeEligible,
  reminderDueForShoot,
  reminderIdempotencyKey,
  reminderKindForEventType,
  REMINDER_LOOKAHEAD_DAYS,
  shootWelcomeIdempotencyKey,
  toTemplateTime,
} from "@/domain/automation/flows/rules";
import { absoluteSiteUrl, portalPaths } from "@/domain/automation/links";
import { firstNameOf, normalizeRecipient } from "@/domain/automation/recipients";
import { addCivilDays, studioWallTimeToInstant } from "@/domain/automation/studio-time";

const shootId = "00000000-0000-4000-8000-00000000A101";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("studio time", () => {
  it("converts a Manaus wall-clock time into the UTC instant", () => {
    expect(studioWallTimeToInstant("2026-10-05", "09:00").toISOString()).toBe("2026-10-05T13:00:00.000Z");
    expect(studioWallTimeToInstant("2026-12-31", "23:30").toISOString()).toBe("2027-01-01T03:30:00.000Z");
  });

  it("adds calendar days across month and year boundaries", () => {
    expect(addCivilDays("2026-10-30", 7)).toBe("2026-11-06");
    expect(addCivilDays("2027-01-03", -7)).toBe("2026-12-27");
  });
});

describe("recipients and links", () => {
  it("normalizes valid addresses and refuses missing or invalid ones", () => {
    expect(normalizeRecipient("  Ana@Example.TEST ")).toBe("ana@example.test");
    expect(normalizeRecipient(null)).toBeNull();
    expect(normalizeRecipient("")).toBeNull();
    expect(normalizeRecipient("não é e-mail")).toBeNull();
  });

  it("keeps only the first name", () => {
    expect(firstNameOf("  Ana Beatriz Souza ")).toBe("Ana");
    expect(firstNameOf("   ")).toBeUndefined();
    expect(firstNameOf("x".repeat(80))).toHaveLength(60);
  });

  it("builds absolute portal URLs from NEXT_PUBLIC_SITE_URL with a safe fallback", () => {
    expect(absoluteSiteUrl(portalPaths.reveal, "https://preview.studio.test")).toBe(
      "https://preview.studio.test/minha-experiencia/reveal",
    );
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://studio.test/");
    expect(absoluteSiteUrl(portalPaths.checklist)).toBe("https://studio.test/minha-experiencia/checklist");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(absoluteSiteUrl(portalPaths.home)).toBe("https://studiocarollucas.com.br/minha-experiencia");
    expect(absoluteSiteUrl(portalPaths.home, "not a url")).toBe("https://studiocarollucas.com.br/minha-experiencia");
    expect(absoluteSiteUrl(portalPaths.home, "javascript:alert(1)")).toBe(
      "https://studiocarollucas.com.br/minha-experiencia",
    );
  });

  it("formats Postgres times for templates", () => {
    expect(toTemplateTime("15:30:00")).toBe("15:30");
    expect(toTemplateTime(null)).toBeUndefined();
    expect(toTemplateTime("24:00:00")).toBeUndefined();
  });
});

describe("SCL-701 welcome rules", () => {
  const now = new Date("2026-10-01T15:00:00.000Z"); // 11:00 in Manaus

  it("uses one idempotency key per shoot", () => {
    expect(shootWelcomeIdempotencyKey(shootId)).toBe(`shoot.confirmed:${shootId.toLowerCase()}`);
  });

  it("only welcomes live, upcoming reservations", () => {
    expect(isWelcomeEligible({ status: "reserva", shootDate: "2026-10-01" }, now)).toBe(true);
    expect(isWelcomeEligible({ status: "preparacao", shootDate: "2026-11-20" }, now)).toBe(true);
    expect(isWelcomeEligible({ status: "reserva", shootDate: "2026-09-30" }, now)).toBe(false);
    expect(isWelcomeEligible({ status: "realizado", shootDate: "2026-11-20" }, now)).toBe(false);
    expect(isWelcomeEligible({ status: "cancelado", shootDate: "2026-11-20" }, now)).toBe(false);
  });

  it("stops a queued welcome for a cancelled or missing shoot", () => {
    expect(decideShootWelcomeDelivery({ status: "reserva" })).toEqual({ send: true });
    expect(decideShootWelcomeDelivery({ status: "cancelado" })).toMatchObject({ send: false });
    expect(decideShootWelcomeDelivery(null)).toMatchObject({ send: false });
  });
});

describe("SCL-702 reminder rules", () => {
  const today = "2026-10-05";
  const createdLongAgo = new Date("2026-08-01T12:00:00.000Z");

  it("keys reminders by shoot, kind and scheduled date", () => {
    expect(reminderIdempotencyKey("d7", shootId, "2026-10-12")).toBe(
      `shoot.reminder_d7:${shootId.toLowerCase()}:2026-10-12`,
    );
    expect(reminderIdempotencyKey("d1", shootId, "2026-10-06")).toBe(
      `shoot.reminder_d1:${shootId.toLowerCase()}:2026-10-06`,
    );
    expect(reminderIdempotencyKey("d7", shootId, "2026-10-12")).not.toBe(
      reminderIdempotencyKey("d7", shootId, "2026-10-13"),
    );
    expect(reminderKindForEventType("shoot.reminder_d1")).toBe("d1");
    expect(reminderKindForEventType("shoot.confirmed")).toBeNull();
    expect(REMINDER_LOOKAHEAD_DAYS).toBe(7);
  });

  it("uses disjoint windows in studio calendar days", () => {
    expect(dueReminderKind("2026-10-13", today)).toBeNull(); // 8 days
    expect(dueReminderKind("2026-10-12", today)).toBe("d7");
    expect(dueReminderKind("2026-10-07", today)).toBe("d7"); // late catch-up (2 days)
    expect(dueReminderKind("2026-10-06", today)).toBe("d1");
    expect(dueReminderKind("2026-10-05", today)).toBeNull(); // the day itself
    expect(dueReminderKind("2026-10-04", today)).toBeNull();
  });

  it("skips cancelled/rescheduled shoots and D-7 for bookings made inside the week", () => {
    expect(reminderDueForShoot({ status: "reserva", shootDate: "2026-10-12", createdAt: createdLongAgo }, today)).toBe("d7");
    expect(reminderDueForShoot({ status: "preparacao", shootDate: "2026-10-06", createdAt: createdLongAgo }, today)).toBe("d1");
    expect(reminderDueForShoot({ status: "cancelado", shootDate: "2026-10-12", createdAt: createdLongAgo }, today)).toBeNull();
    expect(reminderDueForShoot({ status: "reagendado", shootDate: "2026-10-06", createdAt: createdLongAgo }, today)).toBeNull();
    // Booked on its own D-7 day (Manaus) → the welcome is enough.
    expect(
      reminderDueForShoot({ status: "reserva", shootDate: "2026-10-12", createdAt: new Date("2026-10-05T12:00:00.000Z") }, today),
    ).toBeNull();
    // Booked the day before its D-7 day → still reminded.
    expect(
      reminderDueForShoot({ status: "reserva", shootDate: "2026-10-12", createdAt: new Date("2026-10-05T03:59:00.000Z") }, today),
    ).toBe("d7");
    // D-1 does not depend on when the booking was made.
    expect(
      reminderDueForShoot({ status: "reserva", shootDate: "2026-10-06", createdAt: new Date("2026-10-05T12:00:00.000Z") }, today),
    ).toBe("d1");
  });

  it("re-checks status, date and window at send time", () => {
    const payload = { shootId, kind: "d1", shootDate: "2026-10-06" };
    const shoot = { status: "reserva", shootDate: "2026-10-06" };

    expect(decideShootReminderDelivery({ kind: "d1", payload, shoot, today })).toEqual({ send: true });
    expect(decideShootReminderDelivery({ kind: "d1", payload, shoot: { ...shoot, status: "cancelado" }, today })).toMatchObject({
      send: false,
    });
    expect(
      decideShootReminderDelivery({ kind: "d1", payload, shoot: { ...shoot, status: "reagendado" }, today }),
    ).toMatchObject({ send: false });
    expect(
      decideShootReminderDelivery({ kind: "d1", payload, shoot: { ...shoot, shootDate: "2026-10-20" }, today }),
    ).toEqual({ send: false, reason: "data do ensaio alterada" });
    // A retry that slipped into the shoot day is no longer "amanhã".
    expect(decideShootReminderDelivery({ kind: "d1", payload, shoot, today: "2026-10-06" })).toEqual({
      send: false,
      reason: "lembrete fora da janela",
    });
    expect(decideShootReminderDelivery({ kind: "d1", payload, shoot: null, today })).toMatchObject({ send: false });
    expect(decideShootReminderDelivery({ kind: "d1", payload: {}, shoot, today })).toMatchObject({ send: false });
  });
});

describe("SCL-703 gallery rules", () => {
  it("uses one idempotency key per gallery and only sends while published", () => {
    expect(galleryPublishedIdempotencyKey("00000000-0000-4000-8000-00000000B001")).toBe(
      "gallery.published:00000000-0000-4000-8000-00000000b001",
    );
    expect(decideGalleryPublishedDelivery({ status: "published" })).toEqual({ send: true });
    expect(decideGalleryPublishedDelivery({ status: "draft" })).toMatchObject({ send: false });
    expect(decideGalleryPublishedDelivery(null)).toMatchObject({ send: false });
  });
});
