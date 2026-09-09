import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuizResult } from "@/components/site/quiz/quiz-result";

const mocks = vi.hoisted(() => ({ trackPublicEvent: vi.fn() }));

vi.mock("@/lib/site/analytics", () => ({ trackPublicEvent: mocks.trackPublicEvent }));

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

  it("keeps contact capture optional and does not submit without consent", () => {
    const captureLead = vi.fn();

    render(<QuizResult result={result} answers={{ production: "textura", looks: "3", investment: "up-to-700" }} onRestart={vi.fn()} captureLead={captureLead} />);

    expect(captureLead).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /salvar meus dados/i })).toBeDisabled();
  });

  it("tracks WhatsApp context without passing contact fields", () => {
    render(<QuizResult result={result} answers={{ production: "textura", looks: "3", investment: "up-to-700" }} onRestart={vi.fn()} />);

    fireEvent.click(screen.getByRole("link", { name: /WhatsApp/i }));

    expect(mocks.trackPublicEvent).toHaveBeenCalledWith({ name: "quiz_whatsapp_clicked", source: "quiz" });
  });
});
