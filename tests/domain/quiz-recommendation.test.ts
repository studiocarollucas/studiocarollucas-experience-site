import { describe, expect, it } from "vitest";
import { recommendPackage, type QuizAnswers, type ServerQuizPackage } from "@/domain/quiz/recommendation";

const packages: ServerQuizPackage[] = [
  { id: "c", familySlug: "aniversario", name: "Cinderela", basePrice: "350.00", outfitsLimit: 2, sceneCount: 1, participantLimit: 1, paletteEligible: true },
  { id: "a", familySlug: "aniversario", name: "Aurora", basePrice: "590.00", outfitsLimit: 3, sceneCount: 2, participantLimit: 1, paletteEligible: true },
  { id: "d", familySlug: "aniversario", name: "Diana", basePrice: "800.00", outfitsLimit: 4, sceneCount: 3, participantLimit: 3, paletteEligible: true },
];

const answers: QuizAnswers = {
  familySlug: "aniversario",
  aesthetic: "romantica",
  feeling: "delicada",
  production: "textura",
  looks: "3",
  investment: "up-to-700",
};

describe("recommendPackage", () => {
  it("never recommends another family", () => {
    const result = recommendPackage(answers, [
      ...packages,
      { ...packages[0], id: "g1", familySlug: "gestante", name: "Gestante 1" },
    ]);
    expect(result.package.id).not.toBe("g1");
  });

  it("uses investment range before preferring a larger package", () => {
    const result = recommendPackage(answers, packages);
    expect(result.package.name).toBe("Aurora");
  });

  it("returns the closest price match when range has no candidate", () => {
    const result = recommendPackage({ ...answers, investment: "up-to-500" }, packages.slice(1));
    expect(result.usedClosestBudgetMatch).toBe(true);
    expect(result.package.name).toBe("Aurora");
  });

  it("uses the smaller package as deterministic tie-break", () => {
    const tiedPackages = [
      { ...packages[0], basePrice: "590.00" },
      { ...packages[1], basePrice: "650.00", outfitsLimit: 2, sceneCount: 1 },
    ];
    const result = recommendPackage(
      { ...answers, looks: "2", production: "clean", investment: "up-to-700" },
      tiedPackages,
    );
    expect(result.package.name).toBe("Cinderela");
  });
});
