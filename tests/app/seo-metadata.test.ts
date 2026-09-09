import { describe, expect, it } from "vitest";
import { metadata as clientMetadata } from "@/app/(client)/layout";
import { metadata as protectedAdminMetadata } from "@/app/admin/(protected)/layout";
import { metadata as adminMetadata } from "@/app/admin/layout";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("public SEO metadata", () => {
  it("lists only canonical public URLs in sitemap", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual([
      "https://studiocarollucas.com.br/",
      "https://studiocarollucas.com.br/experiencias",
      "https://studiocarollucas.com.br/quiz",
    ]);
    expect(urls).not.toContain(expect.stringContaining("/admin"));
    expect(urls).not.toContain(expect.stringContaining("/minha-experiencia"));
  });

  it("disallows private route prefixes in robots", () => {
    expect(robots().rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          disallow: expect.arrayContaining(["/admin/", "/minha-experiencia/", "/auth/", "/api/"]),
        }),
      ]),
    );
  });

  it("prevents private layouts from being indexed", () => {
    for (const metadata of [clientMetadata, protectedAdminMetadata, adminMetadata]) {
      expect(metadata.robots).toMatchObject({ index: false, follow: false });
    }
  });
});
