import { describe, expect, it } from "vitest";
import { quizContactUrl } from "@/lib/site/contact";

describe("quizContactUrl", () => {
  it("puts package and palette in a valid wa.me URL", () => {
    const url = new URL(quizContactUrl({
      familyName: "Aniversário",
      packageName: "Aurora",
      persona: "Romântica Editorial",
      production: "Cenário elaborado",
      looks: "Três ou mais looks",
      investment: "De R$ 501 a R$ 700",
      palette: "Rosé e românticos",
    }));
    expect(url.hostname).toBe("wa.me");
    expect(url.searchParams.get("text")).toContain("Aurora");
    expect(url.searchParams.get("text")).toContain("Rosé e românticos");
  });
});
