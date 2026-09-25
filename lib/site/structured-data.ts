import { studioWhatsAppNumber } from "@/lib/site/contact";
import type { experiences } from "@/lib/site/experiences";

export type JsonLdObject = Record<string, unknown>;

type PublicExperience = Pick<
  (typeof experiences)[number],
  "slug" | "name" | "introduction" | "hero"
>;

const STUDIO_NAME = "Stúdio Carol Lucas";
const STUDIO_DESCRIPTION =
  "Experiências fotográficas autorais para celebrar a sua história no Stúdio Carol Lucas.";

function siteUrl() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://studiocarollucas.com.br");
}

function absoluteUrl(pathname: string) {
  return new URL(pathname, siteUrl()).toString();
}

function studioId() {
  return absoluteUrl("/#studio");
}

function optionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Public postal address, only when explicitly configured. Nothing is inferred:
 * without STUDIO_PUBLIC_* values the address is omitted from structured data.
 */
function studioAddress(): JsonLdObject | undefined {
  const fields = Object.entries({
    streetAddress: optionalEnv(process.env.STUDIO_PUBLIC_STREET_ADDRESS),
    addressLocality: optionalEnv(process.env.STUDIO_PUBLIC_ADDRESS_LOCALITY),
    addressRegion: optionalEnv(process.env.STUDIO_PUBLIC_ADDRESS_REGION),
    postalCode: optionalEnv(process.env.STUDIO_PUBLIC_POSTAL_CODE),
  }).filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (fields.length === 0) return undefined;
  return { "@type": "PostalAddress", ...Object.fromEntries(fields), addressCountry: "BR" };
}

/** Public profile URLs (e.g. Instagram), comma-separated; only https URLs are kept. */
function studioSameAs() {
  return (process.env.STUDIO_PUBLIC_SAME_AS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    });
}

function studioReference(): JsonLdObject {
  return { "@type": "ProfessionalService", "@id": studioId(), name: STUDIO_NAME, url: absoluteUrl("/") };
}

/** schema.org ProfessionalService (a LocalBusiness subtype) for the studio home page. */
export function studioJsonLd(): JsonLdObject {
  const address = studioAddress();
  const sameAs = studioSameAs();

  return {
    "@context": "https://schema.org",
    ...studioReference(),
    description: STUDIO_DESCRIPTION,
    image: absoluteUrl("/images/site/home/quinze-guitarra.webp"),
    telephone: `+${studioWhatsAppNumber()}`,
    ...(address ? { address } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/** schema.org Service for one editorial experience page. No offers or prices by design. */
export function experienceJsonLd(experience: PublicExperience): JsonLdObject {
  const url = absoluteUrl(`/experiencias/${experience.slug}`);
  const locality = optionalEnv(process.env.STUDIO_PUBLIC_ADDRESS_LOCALITY);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: `Ensaio ${experience.name}`,
    serviceType: "Ensaio fotográfico",
    description: experience.introduction,
    url,
    image: absoluteUrl(`/images/site/home/${experience.hero}.webp`),
    provider: studioReference(),
    ...(locality ? { areaServed: { "@type": "City", name: locality } } : {}),
  };
}

/** JSON.stringify with `<` escaped, as recommended by the Next.js JSON-LD guide. */
export function serializeJsonLd(data: JsonLdObject) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
