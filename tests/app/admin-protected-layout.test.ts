import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("protected admin layout", () => {
  it("renders protected routes only at request time", async () => {
    const source = await readFile(path.resolve("app/admin/(protected)/layout.tsx"), "utf8");

    expect(source).toContain('export const dynamic = "force-dynamic"');
  });
});
