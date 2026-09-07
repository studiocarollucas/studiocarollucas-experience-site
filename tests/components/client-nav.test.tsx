import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientNav } from "@/components/client/client-nav";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

describe("ClientNav", () => {
  beforeEach(() => usePathname.mockReturnValue("/minha-experiencia"));

  it("renders only implemented portal destinations", () => {
    render(<ClientNav />);

    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute(
      "href",
      "/minha-experiencia"
    );
    expect(screen.getByRole("link", { name: "Checklist" })).toHaveAttribute(
      "href",
      "/minha-experiencia/checklist"
    );
    expect(screen.getByRole("link", { name: "Meu ensaio" })).toHaveAttribute(
      "href",
      "/minha-experiencia/ensaio"
    );
    expect(screen.getByRole("link", { name: "Styling" })).toHaveAttribute(
      "href",
      "/minha-experiencia/styling"
    );
    expect(screen.queryByRole("link", { name: /galeria/i })).not.toBeInTheDocument();
  });

  it("marks the current destination", () => {
    usePathname.mockReturnValue("/minha-experiencia/checklist");
    render(<ClientNav />);

    expect(screen.getByRole("link", { name: "Checklist" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
