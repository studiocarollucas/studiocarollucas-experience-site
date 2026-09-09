import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createLead: vi.fn(), recommendQuizPackage: vi.fn() }));

vi.mock("@/domain/leads/service", () => ({ createLead: mocks.createLead }));
vi.mock("@/domain/quiz/catalog", () => ({ recommendQuizPackage: mocks.recommendQuizPackage }));

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
    mocks.recommendQuizPackage.mockReset();
    mocks.recommendQuizPackage.mockResolvedValue(validInput.result);
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

  it("persists only the recommendation recomputed from the answers", async () => {
    mocks.createLead.mockResolvedValue({ id: "lead-1" });
    mocks.recommendQuizPackage.mockResolvedValue({
      ...validInput.result,
      packageName: "Pacote autorizado",
      familyName: "Família autorizada",
      persona: "Persona autorizada",
    });

    await captureQuizLead({
      ...validInput,
      consent: true,
      result: { ...validInput.result, packageName: "Pacote adulterado", persona: "Persona adulterada" },
    });

    expect(mocks.recommendQuizPackage).toHaveBeenCalledWith(validInput.answers);
    expect(mocks.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        quizResult: JSON.stringify({
          persona: "Persona autorizada",
          package: "Pacote autorizado",
          family: "Família autorizada",
          answers: validInput.answers,
        }),
      }),
    );
  });

  it("rejects answers that the trusted catalog cannot recommend", async () => {
    mocks.recommendQuizPackage.mockRejectedValue(new Error("família sem pacote elegível"));

    await expect(
      captureQuizLead({
        ...validInput,
        consent: true,
        answers: { ...validInput.answers, familySlug: "familia-inexistente" },
      }),
    ).rejects.toThrow("família sem pacote elegível");

    expect(mocks.createLead).not.toHaveBeenCalled();
  });

  it("rejects an invalid phone before persisting", async () => {
    await expect(captureQuizLead({ ...validInput, consent: true, phone: "abc" })).rejects.toThrow();

    expect(mocks.createLead).not.toHaveBeenCalled();
  });

  it("rejects letters mixed with otherwise valid phone digits", async () => {
    await expect(captureQuizLead({ ...validInput, consent: true, phone: "abc1234567890" })).rejects.toThrow();

    expect(mocks.createLead).not.toHaveBeenCalled();
  });

  it("rejects answers with an invalid enum value before recommending", async () => {
    await expect(
      captureQuizLead({
        ...validInput,
        consent: true,
        answers: { ...validInput.answers, aesthetic: "invalid" as never },
      }),
    ).rejects.toThrow();

    expect(mocks.recommendQuizPackage).not.toHaveBeenCalled();
    expect(mocks.createLead).not.toHaveBeenCalled();
  });

  it("rejects invalid contact data before persisting", async () => {
    await expect(captureQuizLead({ ...validInput, consent: true, email: "invalid-email" })).rejects.toThrow();

    expect(mocks.createLead).not.toHaveBeenCalled();
  });

  it("rejects a structurally valid email longer than 254 characters before persisting", async () => {
    const email = `${"a".repeat(243)}@example.com`;

    await expect(captureQuizLead({ ...validInput, consent: true, email })).rejects.toThrow();

    expect(mocks.createLead).not.toHaveBeenCalled();
  });
});
