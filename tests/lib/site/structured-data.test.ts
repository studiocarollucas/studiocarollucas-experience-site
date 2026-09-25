import { afterEach, describe, expect, it, vi } from "vitest";
import { findExperience } from "@/lib/site/experiences";
import { experienceJsonLd, serializeJsonLd, studioJsonLd } from "@/lib/site/structured-data";

function clearPublicStudioEnv() {
  for (const name of [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_STUDIO_WHATSAPP_URL",
    "STUDIO_PUBLIC_STREET_ADDRESS",
    "STUDIO_PUBLIC_ADDRESS_LOCALITY",
    "STUDIO_PUBLIC_ADDRESS_REGION",
    "STUDIO_PUBLIC_POSTAL_CODE",
    "STUDIO_PUBLIC_SAME_AS",
  ]) {
    vi.stubEnv(name, "");
  }
}

describe("studioJsonLd", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("describes the studio with repository data only and omits unconfigured optional fields", () => {
    clearPublicStudioEnv();

    const data = studioJsonLd();

    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": "https://studiocarollucas.com.br/#studio",
      name: "Stúdio Carol Lucas",
      url: "https://studiocarollucas.com.br/",
      description: expect.any(String),
      image: "https://studiocarollucas.com.br/images/site/home/quinze-guitarra.webp",
      telephone: "+5592984140492",
    });
  });

  it("derives the telephone from the environment-configured WhatsApp URL", () => {
    vi.stubEnv("NEXT_PUBLIC_STUDIO_WHATSAPP_URL", "https://wa.me/5592911112222");

    expect(studioJsonLd()).toMatchObject({ telephone: "+5592911112222" });
  });

  it("adds a postal address and https profiles only when configured", () => {
    clearPublicStudioEnv();
    vi.stubEnv("STUDIO_PUBLIC_ADDRESS_LOCALITY", "Manaus");
    vi.stubEnv("STUDIO_PUBLIC_ADDRESS_REGION", "AM");
    vi.stubEnv(
      "STUDIO_PUBLIC_SAME_AS",
      "https://www.instagram.com/studio.example, javascript:alert(1), http://insecure.example",
    );

    expect(studioJsonLd()).toMatchObject({
      address: {
        "@type": "PostalAddress",
        addressLocality: "Manaus",
        addressRegion: "AM",
        addressCountry: "BR",
      },
      sameAs: ["https://www.instagram.com/studio.example"],
    });
    expect(studioJsonLd().address).not.toHaveProperty("streetAddress");
  });
});

describe("experienceJsonLd", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("describes an experience as a Service provided by the studio, without offers", () => {
    clearPublicStudioEnv();
    const experience = findExperience("familia");
    if (!experience) throw new Error("missing familia fixture");

    const data = experienceJsonLd(experience);

    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Ensaio Família",
      description: experience.introduction,
      url: "https://studiocarollucas.com.br/experiencias/familia",
      provider: { "@type": "ProfessionalService", "@id": "https://studiocarollucas.com.br/#studio" },
    });
    expect(data).not.toHaveProperty("offers");
    expect(data).not.toHaveProperty("areaServed");
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so structured data cannot close the script tag", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });

    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
