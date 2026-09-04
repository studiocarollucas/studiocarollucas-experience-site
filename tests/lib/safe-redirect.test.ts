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

  // Browsers normalize a backslash, tab or newline after the leading "/" into an authority
  // separator when resolving a Location header, so each of these resolves to https://evil.com/
  // despite starting with a single "/". A startsWith("//") check does not catch them.
  it("rejects a backslash authority bypass", () => {
    expect(isSafeRedirect("/\\evil.com")).toBe(false);
  });

  it("rejects a tab-separated authority bypass", () => {
    expect(isSafeRedirect("/\t/evil.com")).toBe(false);
  });

  it("rejects a newline-separated authority bypass", () => {
    expect(isSafeRedirect("/\n/evil.com")).toBe(false);
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
