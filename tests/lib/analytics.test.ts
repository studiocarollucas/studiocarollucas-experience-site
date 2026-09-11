import { afterEach, describe, expect, it, vi } from "vitest";
import { trackPublicEvent } from "@/lib/site/analytics";

describe("trackPublicEvent", () => {
  afterEach(() => {
    delete window.gtag;
  });

  it("sends only the allow-listed non-PII payload to gtag", () => {
    window.gtag = vi.fn();

    trackPublicEvent({ name: "quiz_whatsapp_clicked", source: "quiz" });

    expect(window.gtag).toHaveBeenCalledWith("event", "quiz_whatsapp_clicked", { source: "quiz" });
  });

  it("does nothing when GA is unavailable", () => {
    expect(() => trackPublicEvent({ name: "quiz_lead_created", source: "quiz" })).not.toThrow();
  });

  it("tracks Paixão Clutch discovery without public item fields", () => {
    window.gtag = vi.fn();

    trackPublicEvent({ name: "paixao_clutch_home_clicked", source: "home" });

    expect(window.gtag).toHaveBeenCalledWith("event", "paixao_clutch_home_clicked", { source: "home" });
  });
});
