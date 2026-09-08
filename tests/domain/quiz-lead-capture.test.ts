import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createLead: vi.fn() }));

vi.mock("@/domain/leads/service", () => ({ createLead: mocks.createLead }));

import { captureQuizLead } from "@/domain/quiz/lead-capture";

const validInput = {
  name: "Carolina Lucas",
  email: "carolina@example.com",
  phone: "(92) 99999-0000",
  result: {
    packageId: "0d6a2f9b-96e1-4c5d-9b9e-3f3ac3edc8f6",
    packageName: "Experiência Editorial",
    familyName: "Retratos",
    persona: "Clássica contemporânea",
    personaCopy: "Não deve persistir.",
    styling: "Não deve persistir.",
    sceneDirection: "Não deve persistir.",
    paletteEligible: true,
    usedClosestBudgetMatch: false,
  },
  answers: {
    familySlug: "retratos",
    aesthetic: "classica" as const,
    feeling: "atemporal" as const,
    production: "clean" as const,
    looks: "2" as const,
    investment: "up-to-700" as const,
  },
};

describe("captureQuizLead", () => {
  beforeEach(() => {
    mocks.createLead.mockReset();
  });

  it("does not call createLead when consent is false", async () => {
    await expect(captureQuizLead({ ...validInput, consent: false })).resolves.toEqual({ created: false });

    expect(mocks.createLead).not.toHaveBeenCalled();
  });

  it("creates a quiz Lead only after valid consent", async () => {
    mocks.createLead.mockResolvedValue({ id: "lead-1" });

    await expect(captureQuizLead({ ...validInput, consent: true })).resolves.toEqual({ created: true });

    expect(mocks.createLead).toHaveBeenCalledWith({
      source: "quiz",
      name: validInput.name,
      email: validInput.email,
      phone: validInput.phone,
      quizResult: JSON.stringify({
        persona: validInput.result.persona,
        package: validInput.result.packageName,
        family: validInput.result.familyName,
        answers: validInput.answers,
      }),
    });
  });

  it("rejects invalid contact data before persisting", async () => {
    await expect(captureQuizLead({ ...validInput, consent: true, email: "invalid-email" })).rejects.toThrow();

    expect(mocks.createLead).not.toHaveBeenCalled();
  });
});
