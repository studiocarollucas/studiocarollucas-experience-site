import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ClientHome from "@/app/(client)/minha-experiencia/page";

describe("ClientHome", () => {
  it("leaves the main landmark to the protected layout", () => {
    render(<ClientHome />);

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Minha Experiência" })).toBeInTheDocument();
  });
});
