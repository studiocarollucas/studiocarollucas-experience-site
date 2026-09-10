import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("postgres client options", () => {
  it("uses the minimum valid pipeline capacity when serializing Supavisor queries", async () => {
    const source = await readFile(path.resolve("db/client.ts"), "utf8");

    expect(source).toMatch(/max_pipeline:\s*1,/);
    expect(source).not.toMatch(/max_pipeline:\s*0,/);
  });
});
