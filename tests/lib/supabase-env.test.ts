import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("supabase env contract", () => {
  it(".env.example documents every variable lib/supabase reads", () => {
    const envExample = fs.readFileSync(path.resolve(".env.example"), "utf-8");
    expect(envExample).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(envExample).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(envExample).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(envExample).toContain("NEXT_PUBLIC_STUDIO_WHATSAPP_URL");
  });

  it("service role key is never referenced with the NEXT_PUBLIC_ prefix anywhere in lib/", () => {
    const files = fs.readdirSync(path.resolve("lib"), { recursive: true }) as string[];
    const tsFiles = files.filter((f) => f.toString().endsWith(".ts"));
    for (const file of tsFiles) {
      const content = fs.readFileSync(path.resolve("lib", file.toString()), "utf-8");
      expect(content).not.toMatch(/NEXT_PUBLIC_.*SERVICE_ROLE/);
    }
  });
});
