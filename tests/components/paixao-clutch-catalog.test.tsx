import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import { PaixaoClutchCatalog } from "@/components/site/paixao-clutch-catalog";

const clutches = [
  { id: "1", slug: "dourada", name: "Clutch dourada", copy: "Copy dourada.", rentalPrice: "120.00", publicImagePath: "/public/dourada.webp", featured: true, sortOrder: 0, color: "Dourado", size: "Média", description: "Acabamento metalizado." },
  { id: "2", slug: "preta", name: "Clutch preta", copy: "Copy preta.", rentalPrice: "90.00", publicImagePath: "/public/preta.webp", featured: false, sortOrder: 1, color: "Preto", size: "Pequena", description: "Veludo intenso." },
  { id: "3", slug: "prata", name: "Clutch prata", copy: "Copy prata.", rentalPrice: "110.00", publicImagePath: "/public/prata.webp", featured: false, sortOrder: 2, color: "Prata", size: "Média", description: "Brilho acetinado." },
];

describe("PaixaoClutchCatalog", () => {
  it("combines color and size filters, and restores the complete catalog", () => {
    render(<PaixaoClutchCatalog clutches={clutches} />);

    expect(screen.getByText("3 clutches encontradas")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Filtrar por cor" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Filtrar por tamanho" })).toBeInTheDocument();
    expect(screen.getByText("Dourado · Média")).toBeInTheDocument();
    expect(screen.getByText("Acabamento metalizado.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dourado" }));
    expect(screen.getByText("1 clutch encontrada")).toBeInTheDocument();
    expect(screen.queryByText("Clutch preta")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pequena" }));
    expect(screen.getByText("Nenhuma clutch encontrada com esses filtros.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(screen.getByText("3 clutches encontradas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /conhecer clutch prata/i })).toHaveAttribute("href", "/paixao-clutch/prata");
  });

  it("keeps internal identifiers out of the catalog UI", () => {
    render(<PaixaoClutchCatalog clutches={clutches} />);

    expect(document.body.textContent).not.toContain('"id"');
    expect(document.body.textContent).not.toContain("replacementValue");
  });
});
