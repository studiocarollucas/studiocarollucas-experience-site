import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  trackPublicEvent: vi.fn(),
}));

vi.mock("@/domain/inventory/public-clutch", () => ({
  listPublicPaixaoClutches: mocks.list,
}));
vi.mock("@/lib/site/analytics", () => ({
  trackPublicEvent: mocks.trackPublicEvent,
}));
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <span role="img" aria-label={alt} data-src={src} />
  ),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import Home from "@/app/(site)/page";

const clutch = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "clutch-dourada-cl-001",
  name: "Clutch dourada",
  copy: "Um brilho discreto para a produção.",
  rentalPrice: "120.00",
  publicImagePath: "/api/public/inventory-media/dourada.webp",
  featured: true,
  sortOrder: 0,
  code: "CL-001",
  replacementValue: "250.00",
  internalNotes: "Nunca renderizar",
};

describe("Paixão Clutch home discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([clutch]);
  });

  it("renders a compact editorial teaser with one safe public image and no commercial or private fields", async () => {
    render(await Home());

    expect(screen.getByRole("link", { name: /conhecer paixão clutch/i })).toHaveAttribute(
      "href",
      "/paixao-clutch",
    );
    expect(screen.getByRole("img", { name: "Clutch dourada" })).toHaveAttribute(
      "data-src",
      clutch.publicImagePath,
    );
    expect(screen.queryByText("R$ 120,00")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("CL-001");
    expect(document.body.textContent).not.toContain("250.00");
    expect(document.body.textContent).not.toContain("Nunca renderizar");
  });

  it("keeps the editorial link useful without an image when the safe collection is empty", async () => {
    mocks.list.mockResolvedValue([]);

    render(await Home());

    expect(screen.getByRole("link", { name: /conhecer paixão clutch/i })).toHaveAttribute(
      "href",
      "/paixao-clutch",
    );
    expect(screen.queryByRole("img", { name: "Clutch dourada" })).not.toBeInTheDocument();
    expect(screen.getByText(/detalhes que acompanham sua produção/i)).toBeInTheDocument();
  });

  it("tracks the collection entry without passing item data", async () => {
    render(await Home());

    const link = screen.getByRole("link", { name: /conhecer paixão clutch/i });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);

    expect(mocks.trackPublicEvent).toHaveBeenCalledWith({
      name: "paixao_clutch_home_clicked",
      source: "home",
    });
  });
});
