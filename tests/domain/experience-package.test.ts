import { describe, it, expect } from "vitest";
import { createExperiencePackageSchema } from "@/domain/catalog/experience-package";

describe("createExperiencePackageSchema", () => {
  it("accepts a valid package", () => {
    const result = createExperiencePackageSchema.safeParse({
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
      name: "",
      basePrice: "890.00",
      includedPhotos: 30,
      durationMinutes: 120,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive includedPhotos", () => {
    const result = createExperiencePackageSchema.safeParse({
      name: "Aurora",
      basePrice: "890.00",
      includedPhotos: 0,
      durationMinutes: 120,
    });
    expect(result.success).toBe(false);
  });
});
