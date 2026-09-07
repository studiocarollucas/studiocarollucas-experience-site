import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuizFlow } from "@/components/site/quiz/quiz-flow";

const families = [{ slug: "newborn", name: "Newborn" }];
const recommendation = vi.fn().mockResolvedValue({
  packageId: "pkg-1",
  packageName: "Newborn 2",
  familyName: "Newborn",
  persona: "Etérea e luminosa",
  personaCopy: "Leveza.",
  styling: "Tons claros.",
  sceneDirection: "Cena suave.",
  paletteEligible: false,
  usedClosestBudgetMatch: false,
});

describe("QuizFlow", () => {
  it("starts with type and blocks continuation without a choice", () => {
    render(<QuizFlow families={families} recommend={recommendation} />);

    expect(screen.getByText("Passo 1 de 6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Newborn" }));
    expect(screen.getByRole("button", { name: /continuar/i })).toBeEnabled();
  });

  it("keeps the family choice after back navigation", () => {
    render(<QuizFlow families={families} recommend={recommendation} />);
    fireEvent.click(screen.getByRole("button", { name: "Newborn" }));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(screen.getByRole("button", { name: "Newborn" })).toHaveAttribute("aria-pressed", "true");
  });
});
