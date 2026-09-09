import { describe, expect, it } from "vitest";
import { metadata as clientMetadata } from "@/app/(client)/layout";
import { metadata as protectedAdminMetadata } from "@/app/admin/(protected)/layout";
import { metadata as adminMetadata } from "@/app/admin/layout";
import { metadata as experiencesMetadata } from "@/app/(site)/experiencias/page";
import { generateMetadata as generateExperienceMetadata } from "@/app/(site)/experiencias/[slug]/page";
import { metadata as quizMetadata } from "@/app/(site)/quiz/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("public SEO metadata", () => {
  it("lists only canonical public URLs in sitemap", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual([
      "https://studiocarollucas.com.br/",
      "https://studiocarollucas.com.br/experiencias",
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

  it("prevents the lead-capture quiz from being indexed", () => {
    expect(quizMetadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("uses route-specific social metadata for the experiences index", () => {
    expect(experiencesMetadata).toMatchObject({
      alternates: { canonical: "/experiencias" },
      openGraph: {
        title: "Experiências fotográficas | Stúdio Carol Lucas",
        description:
          "Conheça os ensaios de 15 anos, aniversário feminino, gestante e newborn. Escolha a experiência que combina com o seu momento.",
        url: "/experiencias",
      },
      twitter: {
        title: "Experiências fotográficas | Stúdio Carol Lucas",
        description:
          "Conheça os ensaios de 15 anos, aniversário feminino, gestante e newborn. Escolha a experiência que combina com o seu momento.",
      },
    });
  });

  it("uses route-specific social metadata for an experience detail", async () => {
    await expect(
      generateExperienceMetadata({ params: Promise.resolve({ slug: "familia" }) }),
    ).resolves.toMatchObject({
      alternates: { canonical: "/experiencias/familia" },
      openGraph: {
        title: "Ensaio Família | Stúdio Carol Lucas",
        description: expect.any(String),
        url: "/experiencias/familia",
      },
      twitter: {
        title: "Ensaio Família | Stúdio Carol Lucas",
        description: expect.any(String),
      },
    });
  });
});
