import type { MetadataRoute } from "next";

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://studiocarollucas.com.br");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/minha-experiencia/", "/auth/", "/api/"],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
