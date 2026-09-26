import { serializeJsonLd, type JsonLdObject } from "@/lib/site/structured-data";

/** Structured data is not executable code, so a native script tag is used instead of next/script. */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
