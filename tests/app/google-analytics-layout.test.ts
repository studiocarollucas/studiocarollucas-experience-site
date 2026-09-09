import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function readAppFile(...segments: string[]) {
  return readFile(path.resolve("app", ...segments), "utf8");
}

describe("Google Analytics layout boundaries", () => {
  it("does not mount Google Analytics in the root layout shared by private routes", async () => {
    await expect(readAppFile("layout.tsx")).resolves.not.toContain("GoogleAnalytics");
  });

  it("mounts Google Analytics only in the public site layout", async () => {
    await expect(readAppFile("(site)", "layout.tsx")).resolves.toContain("GoogleAnalytics");
  });
});
