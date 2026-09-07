import { describe, it, expect } from "vitest";
import { createExperiencePackageSchema } from "@/domain/catalog/experience-package";

const familyId = "f2111111-1111-4111-8111-111111111111";

describe("createExperiencePackageSchema", () => {
  it("accepts a valid package", () => {
    const result = createExperiencePackageSchema.safeParse({
      familyId,
      name: "Aurora",
      basePrice: "890.00",
      includedPhotos: 30,
      durationMinutes: 120,
      makeIncluded: true,
      clutchIncluded: false,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createExperiencePackageSchema.safeParse({
      familyId,
      name: "",
      basePrice: "890.00",
      includedPhotos: 30,
      durationMinutes: 120,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive includedPhotos", () => {
    const result = createExperiencePackageSchema.safeParse({
      familyId,
      name: "Aurora",
      basePrice: "890.00",
      includedPhotos: 0,
      durationMinutes: 120,
    });
    expect(result.success).toBe(false);
  });

  it("keeps structured quiz fields for an eligible package", () => {
    const result = createExperiencePackageSchema.safeParse({
      familyId,
      name: "Debutante 2",
      basePrice: "599.00",
      includedPhotos: 20,
      durationMinutes: 60,
      outfitsLimit: 3,
      sceneCount: 2,
      participantLimit: 1,
      videoCount: 1,
      makeIncluded: true,
      hairIncluded: true,
      paletteEligible: true,
      active: true,
      published: true,
      quizEligible: true,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      familyId,
      outfitsLimit: 3,
      sceneCount: 2,
      participantLimit: 1,
      videoCount: 1,
      hairIncluded: true,
      paletteEligible: true,
      published: true,
      quizEligible: true,
    });
  });

  it("rejects a quiz package that is not published", () => {
    const result = createExperiencePackageSchema.safeParse({
      familyId: "f2111111-1111-4111-8111-111111111111",
      name: "Rascunho",
      basePrice: "499.00",
      includedPhotos: 15,
      durationMinutes: 50,
      active: true,
      published: false,
      quizEligible: true,
    });

    expect(result.success).toBe(false);
  });
});
