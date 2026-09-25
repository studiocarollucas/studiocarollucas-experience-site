import { afterEach, describe, expect, it, vi } from "vitest";
import {
  contactUrl,
  paixaoClutchCollectionContactUrl,
  paixaoClutchContactUrl,
  studioWhatsAppLabel,
  studioWhatsAppNumber,
} from "@/lib/site/contact";

describe("public WhatsApp contact helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the environment-configured wa.me number for links and the visible label", () => {
    vi.stubEnv("NEXT_PUBLIC_STUDIO_WHATSAPP_URL", "https://wa.me/5592911112222");

    expect(new URL(contactUrl("Família")).pathname).toBe("/5592911112222");
    expect(studioWhatsAppNumber()).toBe("5592911112222");
    expect(studioWhatsAppLabel()).toBe("(92) 91111-2222");
  });

  it("falls back to the studio number when the configured URL is not a wa.me link", () => {
    vi.stubEnv("NEXT_PUBLIC_STUDIO_WHATSAPP_URL", "https://example.com/5592911112222");

    expect(new URL(contactUrl()).hostname).toBe("wa.me");
    expect(studioWhatsAppNumber()).toBe("5592984140492");
    expect(studioWhatsAppLabel()).toBe("(92) 98414-0492");
  });

  it("labels a non-Brazilian number in international format", () => {
    vi.stubEnv("NEXT_PUBLIC_STUDIO_WHATSAPP_URL", "https://wa.me/351912345678");

    expect(studioWhatsAppLabel()).toBe("+351912345678");
  });

  it("names the public experience in the message without any visitor data", () => {
    const text = new URL(contactUrl("Família")).searchParams.get("text");

    expect(text).toBe("Olá! Quero conhecer a experiência Família do Stúdio Carol Lucas.");
  });

  it("keeps a useful generic message when no experience is selected", () => {
    expect(new URL(contactUrl()).searchParams.get("text")).toBe(
      "Olá! Quero conversar sobre uma experiência fotográfica no Stúdio Carol Lucas.",
    );
  });

  it("names the Paixão Clutch collection when no item is selected", () => {
    expect(new URL(paixaoClutchCollectionContactUrl()).searchParams.get("text")).toBe(
      "Olá! Quero conversar sobre uma clutch da curadoria Paixão Clutch do Stúdio Carol Lucas.",
    );
  });

  it("asks for a clutch by public name even when the price is not at hand", () => {
    expect(new URL(paixaoClutchContactUrl({ name: "Clutch dourada" })).searchParams.get("text")).toBe(
      "Olá! Quero consultar a disponibilidade da clutch Clutch dourada.",
    );
  });
});
