import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuizResult } from "@/components/site/quiz/quiz-result";

const mocks = vi.hoisted(() => ({ trackPublicEvent: vi.fn() }));

vi.mock("@/lib/site/analytics", () => ({ trackPublicEvent: mocks.trackPublicEvent }));

const result = {
  packageId: "pkg-1", packageName: "Aurora", familyName: "Aniversário", persona: "Romântica editorial",
  personaCopy: "Delicadeza.", styling: "Tons rosé.", sceneDirection: "Cenário suave.", paletteEligible: false,
  usedClosestBudgetMatch: false,
};

const leadAnswers = {
  familySlug: "aniversario",
  aesthetic: "romantica",
  feeling: "delicada",
  production: "textura",
  looks: "3",
  investment: "up-to-700",
} as const;

function fillConsentedContact() {
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana Silva" } });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: "+55 (92) 99999-9999" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /salvar meus dados/i }));
}

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

  it("limits the public email field to 254 characters", () => {
    render(<QuizResult result={result} answers={{ production: "textura", looks: "3", investment: "up-to-700" }} onRestart={vi.fn()} />);

    expect(screen.getByLabelText("E-mail")).toHaveAttribute("maxLength", "254");
  });

  it("tracks WhatsApp context without passing contact fields", () => {
    render(<QuizResult result={result} answers={{ production: "textura", looks: "3", investment: "up-to-700" }} onRestart={vi.fn()} />);

    fireEvent.click(screen.getByRole("link", { name: /WhatsApp/i }));

    expect(mocks.trackPublicEvent).toHaveBeenCalledWith({ name: "quiz_whatsapp_clicked", source: "quiz" });
  });

  it("submits the complete consented payload and tracks lead creation without PII", async () => {
    const captureLead = vi.fn().mockResolvedValue({ created: true });

    render(<QuizResult result={result} answers={leadAnswers} leadAnswers={leadAnswers} onRestart={vi.fn()} captureLead={captureLead} />);
    fillConsentedContact();

    await waitFor(() => expect(captureLead).toHaveBeenCalledWith({
      consent: true,
      name: "Ana Silva",
      email: "ana@example.com",
      phone: "+55 (92) 99999-9999",
      result,
      answers: leadAnswers,
    }));
    await waitFor(() => expect(mocks.trackPublicEvent).toHaveBeenCalledWith({ name: "quiz_lead_created", source: "quiz" }));
    expect(mocks.trackPublicEvent.mock.calls.at(-1)?.[0]).toEqual({ name: "quiz_lead_created", source: "quiz" });
  });

  it("shows an accessible error when the action does not create a lead", async () => {
    const captureLead = vi.fn().mockResolvedValue({ created: false });

    render(<QuizResult result={result} answers={leadAnswers} leadAnswers={leadAnswers} onRestart={vi.fn()} captureLead={captureLead} />);
    fillConsentedContact();

    expect(await screen.findByRole("status")).toHaveTextContent(/não foi possível salvar seus dados/i);
  });
});
