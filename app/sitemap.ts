import type { MetadataRoute } from "next";

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://studiocarollucas.com.br");

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/experiencias", "/quiz"].map((pathname) => ({
    url: new URL(pathname, siteUrl).toString(),
    changeFrequency: "weekly",
    priority: pathname === "/" ? 1 : 0.8,
  }));
}
