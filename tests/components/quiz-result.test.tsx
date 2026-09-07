import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuizResult } from "@/components/site/quiz/quiz-result";

const result = {
  packageId: "pkg-1", packageName: "Aurora", familyName: "Aniversário", persona: "Romântica editorial",
  personaCopy: "Delicadeza.", styling: "Tons rosé.", sceneDirection: "Cenário suave.", paletteEligible: false,
  usedClosestBudgetMatch: false,
};

describe("QuizResult", () => {
  it("shows palette only for an eligible package and never shows its price", () => {
    render(<QuizResult result={result} answers={{ production: "textura", looks: "3", investment: "up-to-700" }} onRestart={vi.fn()} />);
    expect(screen.queryByText(/paleta inicial/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });
});
