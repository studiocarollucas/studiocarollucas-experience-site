import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toPublicQuizRecommendation } from "@/domain/quiz/catalog";

describe("public quiz catalog", () => {
  it("requires active, published and quiz-eligible package state", async () => {
    const source = await readFile(path.resolve("domain/quiz/catalog.ts"), "utf8");
    expect(source).toContain("experiencePackages.active");
    expect(source).toContain("experiencePackages.published");
    expect(source).toContain("experiencePackages.quizEligible");
  });

  it("never selects price into the public catalog projection", async () => {
    const source = await readFile(path.resolve("domain/quiz/catalog.ts"), "utf8");
    expect(source).not.toMatch(/basePrice:\s*experiencePackages\.basePrice/);
  });

  it("removes the package price from the recommendation sent to the browser", () => {
    const result = toPublicQuizRecommendation(
      {
        package: {
          id: "package-1",
          familySlug: "gestante",
          name: "Gestante 2",
          basePrice: "780.00",
          outfitsLimit: 2,
          sceneCount: 2,
          participantLimit: 3,
          paletteEligible: false,
        },
        persona: {
          name: "A clássica",
          copy: "Elegância sem excessos.",
          styling: "Linhas limpas",
          sceneDirection: "Tons neutros",
        },
        usedClosestBudgetMatch: false,
      },
      "Gestante",
    );

    expect(result).not.toHaveProperty("basePrice");
    expect(JSON.stringify(result)).not.toContain("780.00");
  });
});
