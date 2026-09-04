import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Agendar experiência</Button>);
    expect(screen.getByRole("button", { name: "Agendar experiência" })).toBeInTheDocument();
  });

  it("applies the ink variant by default", () => {
    render(<Button>Agendar</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-ink");
  });
});
