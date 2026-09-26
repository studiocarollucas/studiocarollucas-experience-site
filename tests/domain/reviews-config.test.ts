// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { readGoogleReviewUrl } from "@/domain/reviews/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readGoogleReviewUrl (SCL-704/SCL-721)", () => {
  it("reads STUDIO_GOOGLE_REVIEW_URL at call time", () => {
    vi.stubEnv("STUDIO_GOOGLE_REVIEW_URL", "  https://g.page/r/studio-carol-lucas/review  ");
    expect(readGoogleReviewUrl()).toBe("https://g.page/r/studio-carol-lucas/review");
    vi.stubEnv("STUDIO_GOOGLE_REVIEW_URL", "");
    expect(readGoogleReviewUrl()).toBeNull();
  });

  it("accepts only absolute https links", () => {
    expect(readGoogleReviewUrl("https://search.google.com/local/writereview?placeid=abc")).toBe(
      "https://search.google.com/local/writereview?placeid=abc",
    );
    for (const value of ["", "   ", "http://g.page/r/x/review", "javascript:alert(1)", "g.page/r/x", "https://"]) {
      expect(readGoogleReviewUrl(value)).toBeNull();
    }
  });
});
