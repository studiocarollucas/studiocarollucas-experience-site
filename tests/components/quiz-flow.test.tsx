import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ trackPublicEvent: vi.fn() }));

vi.mock("@/lib/site/analytics", () => ({ trackPublicEvent: mocks.trackPublicEvent }));

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

const choices = ["Newborn", "Romântica", "Delicada", "Clean editorial", "Uma estética", "Até R$ 500"];

function answerEveryStep() {
  for (const [index, choice] of choices.entries()) {
    fireEvent.click(screen.getByRole("button", { name: choice }));
    fireEvent.click(
      screen.getByRole("button", { name: index === choices.length - 1 ? /ver minha curadoria/i : /continuar/i }),
    );
  }
}

describe("QuizFlow", () => {
  beforeEach(() => {
    mocks.trackPublicEvent.mockClear();
  });

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

  it("tracks quiz_started once on the first choice, without answers", () => {
    render(<QuizFlow families={families} recommend={recommendation} />);

    expect(mocks.trackPublicEvent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Newborn" }));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    fireEvent.click(screen.getByRole("button", { name: "Romântica" }));

    expect(mocks.trackPublicEvent).toHaveBeenCalledTimes(1);
    expect(mocks.trackPublicEvent).toHaveBeenCalledWith({ name: "quiz_started", source: "quiz" });
  });

  it("tracks quiz_completed only after the recommendation arrives", async () => {
    render(<QuizFlow families={families} recommend={recommendation} />);

    answerEveryStep();

    expect(await screen.findByText("Etérea e luminosa")).toBeInTheDocument();
    expect(mocks.trackPublicEvent).toHaveBeenCalledWith({ name: "quiz_completed", source: "quiz" });
  });

  it("does not track quiz_completed when the recommendation fails", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("unavailable"));
    render(<QuizFlow families={families} recommend={failing} />);

    answerEveryStep();

    expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível concluir/i);
    await waitFor(() => expect(failing).toHaveBeenCalledOnce());
    expect(mocks.trackPublicEvent).not.toHaveBeenCalledWith({ name: "quiz_completed", source: "quiz" });
  });
});
