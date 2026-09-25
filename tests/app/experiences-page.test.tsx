import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
  trackPublicEvent: vi.fn(),
}));

vi.mock("@/lib/site/analytics", () => ({ trackPublicEvent: mocks.trackPublicEvent }));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import ExperiencePage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/(site)/experiencias/[slug]/page";
import ExperiencesPage from "@/app/(site)/experiencias/page";

describe("ExperiencePage", () => {
  it("statically generates the family experience with dedicated metadata", async () => {
    expect(generateStaticParams()).toContainEqual({ slug: "familia" });

    await expect(
      generateMetadata({ params: Promise.resolve({ slug: "familia" }) })
    ).resolves.toMatchObject({
      title: "Ensaio Família | Stúdio Carol Lucas",
      description: expect.stringMatching(/história/i),
    });
  });

  it("renders a contextual WhatsApp CTA for the family experience", async () => {
    render(await ExperiencePage({ params: Promise.resolve({ slug: "familia" }) }));

    const cta = screen.getByRole("link", { name: /falar sobre família/i });
    expect(cta).toHaveAttribute("href", expect.stringContaining("experi%C3%AAncia+Fam%C3%ADlia"));
  });

  it("tracks both detail WhatsApp CTAs with origin and the public slug only", async () => {
    render(await ExperiencePage({ params: Promise.resolve({ slug: "familia" }) }));

    for (const name of [/quero conhecer esse ensaio/i, /falar sobre família/i]) {
      mocks.trackPublicEvent.mockClear();
      const cta = screen.getByRole("link", { name });
      cta.addEventListener("click", (event) => event.preventDefault());
      fireEvent.click(cta);

      expect(cta).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/\d+\?text=/));
      expect(mocks.trackPublicEvent).toHaveBeenCalledWith({
        name: "experience_whatsapp_clicked",
        source: "experience_detail",
        experience: "familia",
      });
    }
  });

  it("renders Service structured data without prices", async () => {
    const { container } = render(
      await ExperiencePage({ params: Promise.resolve({ slug: "familia" }) })
    );

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script?.textContent ?? "{}");
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Ensaio Família",
      url: "https://studiocarollucas.com.br/experiencias/familia",
    });
    expect(data).not.toHaveProperty("offers");
  });

  it("uses notFound for an unknown experience slug", async () => {
    await expect(
      ExperiencePage({ params: Promise.resolve({ slug: "desconhecida" }) })
    ).rejects.toThrow("not found");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});

describe("ExperiencesPage", () => {
  it("offers a WhatsApp CTA that works without the quiz and tracks its origin", () => {
    render(<ExperiencesPage />);

    const cta = screen.getByRole("link", { name: /conversar com o estúdio/i });
    cta.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(cta);

    expect(cta).toHaveAttribute("href", expect.stringContaining("wa.me/"));
    expect(mocks.trackPublicEvent).toHaveBeenCalledWith({
      name: "experience_whatsapp_clicked",
      source: "experiences",
    });
  });
});
