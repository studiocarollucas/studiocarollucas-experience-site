import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  list: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
}));

vi.mock("@/domain/inventory/public-clutch", () => ({
  findPublicPaixaoClutch: mocks.find,
  listPublicPaixaoClutches: mocks.list,
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import PaixaoClutchDetailPage, {
  generateMetadata,
} from "@/app/(site)/paixao-clutch/[slug]/page";

const clutch = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "clutch-dourada-cl-001",
  name: "Clutch dourada",
  copy: "Um brilho discreto para a produção.",
  rentalPrice: "120.00",
  publicImagePath: "/api/public/inventory-media/dourada.webp",
  featured: true,
  sortOrder: 0,
};

const related = {
  ...clutch,
  id: "00000000-0000-4000-8000-000000000002",
  slug: "clutch-prata-cl-002",
  name: "Clutch prata",
};

describe("Paixão Clutch detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.find.mockResolvedValue(clutch);
    mocks.list.mockResolvedValue([clutch, related]);
  });

  it("renders public copy, image, BRL price, contextual CTA, and safe related clutches", async () => {
    render(await PaixaoClutchDetailPage({ params: Promise.resolve({ slug: clutch.slug }) }));

    expect(screen.getByRole("navigation", { name: /caminho da página/i })).toHaveTextContent("Paixão Clutch");
    expect(screen.getByRole("img", { name: "Clutch dourada" })).toHaveAttribute("src", clutch.publicImagePath);
    expect(screen.getByRole("heading", { name: "Clutch dourada" })).toBeInTheDocument();
    expect(screen.getByText(clutch.copy)).toBeInTheDocument();
    expect(screen.getByText("R$ 120,00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /consultar disponibilidade/i })).toHaveAttribute(
      "href",
      expect.stringContaining("Clutch+dourada"),
    );
    expect(screen.getByRole("link", { name: /conhecer clutch prata/i })).toHaveAttribute(
      "href",
      "/paixao-clutch/clutch-prata-cl-002",
    );
    expect(screen.queryByRole("link", { name: /conhecer clutch dourada/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("00000000-0000-4000-8000-000000000001");
  });

  it("returns notFound when the safe projection does not contain the slug", async () => {
    mocks.find.mockResolvedValue(null);

    await expect(
      PaixaoClutchDetailPage({ params: Promise.resolve({ slug: "indisponivel" }) }),
    ).rejects.toThrow("not found");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("generates canonical and social metadata from the public editorial projection", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ slug: clutch.slug }) }),
    ).resolves.toMatchObject({
      alternates: { canonical: `/paixao-clutch/${clutch.slug}` },
      openGraph: {
        title: "Clutch dourada | Paixão Clutch | Stúdio Carol Lucas",
        description: clutch.copy,
        url: `/paixao-clutch/${clutch.slug}`,
        images: [clutch.publicImagePath],
      },
      twitter: {
        title: "Clutch dourada | Paixão Clutch | Stúdio Carol Lucas",
        description: clutch.copy,
        images: [clutch.publicImagePath],
      },
    });
  });
});
