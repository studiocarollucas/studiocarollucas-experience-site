import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock("@/domain/inventory/public-clutch", () => ({
  listPublicPaixaoClutches: mocks.list,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import PaixaoClutchPage, { metadata } from "@/app/(site)/paixao-clutch/page";
import PaixaoClutchLayout from "@/app/(site)/paixao-clutch/layout";
import { paixaoClutchContactUrl } from "@/lib/site/contact";

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

describe("Paixão Clutch collection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([clutch]);
  });

  it("renders only editorial public fields with a photo, BRL price, and detail link", async () => {
    render(await PaixaoClutchPage());

    expect(screen.getByText("Paixão Clutch")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Clutch dourada" })).toHaveAttribute("src", clutch.publicImagePath);
    expect(screen.getByText("R$ 120,00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /conhecer clutch dourada/i })).toHaveAttribute(
      "href",
      "/paixao-clutch/clutch-dourada-cl-001",
    );
    expect(document.body.textContent).not.toContain("00000000-0000-4000-8000-000000000001");
    expect(document.body.textContent).not.toContain("replacementValue");
  });

  it("offers a generic WhatsApp CTA when the safe collection is empty", async () => {
    mocks.list.mockResolvedValue([]);

    render(await PaixaoClutchPage());

    expect(screen.getByText(/curadoria está ganhando forma/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /conversar sobre uma clutch/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me/5592984140492"),
    );
  });

  it("uses collection social metadata and keeps the site navigation available", () => {
    expect(metadata).toMatchObject({
      alternates: { canonical: "/paixao-clutch" },
      openGraph: { url: "/paixao-clutch" },
      twitter: { title: expect.stringMatching(/paixão clutch/i) },
    });
    render(<PaixaoClutchLayout>Conteúdo</PaixaoClutchLayout>);
    expect(screen.getAllByRole("link", { name: "Paixão Clutch" })[0]).toHaveAttribute("href", "/paixao-clutch");
  });

  it("builds the item availability WhatsApp message from the public name and formatted price", () => {
    const url = new URL(paixaoClutchContactUrl({ name: clutch.name, formattedPrice: "R$ 120,00" }));
    expect(url.searchParams.get("text")).toBe(
      "Olá! Quero consultar a disponibilidade da clutch Clutch dourada, aluguel de R$ 120,00.",
    );
  });
});
