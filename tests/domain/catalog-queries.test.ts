import { describe, expect, it } from "vitest";
import { canDeactivateExperienceFamily, sortPackageOptions } from "@/domain/catalog/queries";
import { packageFamilyCompatibilityError } from "@/domain/catalog/family";

describe("sortPackageOptions", () => {
  it("orders package options by family and package order", () => {
    const sorted = sortPackageOptions([
      { familySortOrder: 2, packageSortOrder: 1, name: "Gestante 1" },
      { familySortOrder: 1, packageSortOrder: 2, name: "Debutante 2" },
      { familySortOrder: 1, packageSortOrder: 1, name: "Debutante 1" },
    ]);

    expect(sorted.map((item) => item.name)).toEqual([
      "Debutante 1",
      "Debutante 2",
      "Gestante 1",
    ]);
  });
});

describe("canDeactivateExperienceFamily", () => {
  it("only permits deactivation when no active package remains", () => {
    expect(canDeactivateExperienceFamily(0)).toBe(true);
    expect(canDeactivateExperienceFamily(1)).toBe(false);
  });
});

describe("packageFamilyCompatibilityError", () => {
  it("does not allow an active package under an inactive family", () => {
    expect(packageFamilyCompatibilityError({ active: false, published: false }, { active: true, published: false, quizEligible: false }))
      .toMatch(/inativa/i);
  });

  it("does not allow a published package under an unpublished family", () => {
    expect(packageFamilyCompatibilityError({ active: true, published: false }, { active: true, published: true, quizEligible: false }))
      .toMatch(/publique/i);
  });
});
