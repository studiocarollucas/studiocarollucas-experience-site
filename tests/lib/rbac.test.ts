import { describe, it, expect } from "vitest";
import { hasMinimumRole, requireRole } from "@/lib/auth/rbac";
import type { CurrentUser } from "@/lib/auth/session";

const admin: CurrentUser = { id: "1", email: "a@a.com", role: "admin" };
const staff: CurrentUser = { id: "2", email: "s@a.com", role: "staff" };
const client: CurrentUser = { id: "3", email: "c@a.com", role: "client" };

describe("hasMinimumRole", () => {
  it("allows admin to satisfy a staff requirement", () => {
    expect(hasMinimumRole("admin", "staff")).toBe(true);
  });

  it("denies client for a staff requirement", () => {
    expect(hasMinimumRole("client", "staff")).toBe(false);
  });

  it("allows an exact role match", () => {
    expect(hasMinimumRole("staff", "staff")).toBe(true);
  });
});

describe("requireRole", () => {
  it("returns the user when role is sufficient", () => {
    expect(requireRole(admin, "staff")).toBe(admin);
    expect(requireRole(staff, "staff")).toBe(staff);
  });

  it("throws when role is insufficient", () => {
    expect(() => requireRole(client, "staff")).toThrow("Forbidden");
  });

  it("throws when user is null", () => {
    expect(() => requireRole(null, "admin")).toThrow("Forbidden");
  });
});
