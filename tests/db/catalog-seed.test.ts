import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const seedPath = path.resolve("db/seeds/catalog.ts");
const source = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, "utf8") : "";

describe("catalog seed", () => {
  it("declares every approved family without overwriting existing packages", () => {
    expect(source).toContain('slug: "15-anos"');
    expect(source).toContain('slug: "newborn"');
    expect(source).toContain('slug: "corporativo"');
    expect(source).toContain("onConflictDoNothing");
    expect(source).not.toContain(".set({ name:");
  });

  it("includes the source-confirmed package ladder", () => {
    expect(source).toContain('name: "Debutante 4 Duo"');
    expect(source).toContain('name: "Gestante + Newborn"');
    expect(source).toContain('name: "Corporativo 3"');
  });

  it("keeps native-ESM schema imports resolvable by the seed command", () => {
    const packageSchema = fs.readFileSync(path.resolve("db/schema/experience-packages.ts"), "utf8");
    expect(packageSchema).toContain('from "./experience-families.ts"');
  });

  it("preserves exclusions that differ between package tiers", () => {
    expect(source).toContain('name: "Cinderela"');
    expect(source).toContain('makeIncluded: item.makeIncluded ?? true');
    expect(source).toContain('hairIncluded: item.hairIncluded ?? true');
  });
});
