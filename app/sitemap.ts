import type { MetadataRoute } from "next";
import { listPublicPaixaoClutches } from "@/domain/inventory/public-clutch";

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://studiocarollucas.com.br");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const clutches = await listPublicPaixaoClutches();
  const staticPaths = ["/", "/experiencias", "/paixao-clutch"];

  return [
    ...staticPaths.map((pathname) => ({
      url: new URL(pathname, siteUrl).toString(),
      changeFrequency: "weekly" as const,
      priority: pathname === "/" ? 1 : 0.8,
    })),
    ...clutches.map(({ slug }) => ({
      url: new URL(`/paixao-clutch/${slug}`, siteUrl).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
