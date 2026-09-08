import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
}));

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

  it("uses notFound for an unknown experience slug", async () => {
    await expect(
      ExperiencePage({ params: Promise.resolve({ slug: "desconhecida" }) })
    ).rejects.toThrow("not found");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
