import { describe, it, expect } from "vitest";
import { isSafeRedirect, safeRedirect } from "@/lib/auth/safe-redirect";

describe("isSafeRedirect", () => {
  it("accepts a same-origin absolute path", () => {
    expect(isSafeRedirect("/minha-experiencia/algo")).toBe(true);
  });

  it("rejects a protocol-relative URL", () => {
    expect(isSafeRedirect("//evil.com")).toBe(false);
  });

  it("rejects an absolute URL to another origin", () => {
    expect(isSafeRedirect("https://evil.com")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isSafeRedirect(null)).toBe(false);
    expect(isSafeRedirect(undefined)).toBe(false);
  });
});

describe("safeRedirect", () => {
  it("returns the path when safe", () => {
    expect(safeRedirect("/admin/clientes", "/admin")).toBe("/admin/clientes");
  });

  it("falls back when unsafe", () => {
    expect(safeRedirect("//evil.com", "/admin")).toBe("/admin");
    expect(safeRedirect(null, "/minha-experiencia")).toBe("/minha-experiencia");
  });
});
