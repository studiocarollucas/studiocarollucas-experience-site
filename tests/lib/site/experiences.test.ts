import { describe, expect, it } from "vitest";
import { findExperience } from "@/lib/site/experiences";

describe("family experience content", () => {
  it("exposes the editorial family vertical without commercial fields", () => {
    const experience = findExperience("familia");

    expect(experience).toMatchObject({
      slug: "familia",
      name: "Família",
      image: "familia-aconchego",
      hero: "familia-encontro",
    });
    expect(experience?.questions).toHaveLength(2);
    expect(experience).not.toHaveProperty("price");
    expect(experience).not.toHaveProperty("package");
    expect(experience).not.toHaveProperty("duration");
    expect(experience).not.toHaveProperty("availability");
  });
});
