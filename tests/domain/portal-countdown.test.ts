import { describe, expect, it } from "vitest";
import { daysUntilShoot, studioDate } from "@/domain/portal/countdown";

describe("portal countdown", () => {
  it("uses the Manaus calendar date at a UTC boundary", () => {
    expect(studioDate(new Date("2026-09-07T02:30:00.000Z"))).toBe("2026-09-06");
  });

  it("counts calendar days without DST or device timezone", () => {
    expect(daysUntilShoot("2026-09-18", "2026-09-06")).toBe(12);
    expect(daysUntilShoot("2026-09-06", "2026-09-06")).toBe(0);
    expect(daysUntilShoot("2026-09-05", "2026-09-06")).toBe(-1);
  });
});
