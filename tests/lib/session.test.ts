import { describe, it, expect } from "vitest";
import { resolveRole } from "@/lib/auth/session";

describe("resolveRole", () => {
  it("returns the profile's role when a profile row exists", () => {
    expect(resolveRole({ role: "admin" })).toBe("admin");
  });

  it("defaults to client when no profile row exists yet", () => {
    expect(resolveRole(null)).toBe("client");
  });
});
