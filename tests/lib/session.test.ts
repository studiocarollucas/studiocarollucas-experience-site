import { describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import { getCurrentUser, resolveRole } from "@/lib/auth/session";

describe("resolveRole", () => {
  it("returns the profile's role when a profile row exists", () => {
    expect(resolveRole({ role: "admin" })).toBe("admin");
  });

  it("defaults to client when no profile row exists yet", () => {
    expect(resolveRole(null)).toBe("client");
  });
});

describe("getCurrentUser", () => {
  it("uses an injected cookie-bound client without creating another one", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });
    const suppliedClient = { auth: { getUser } };

    await expect(getCurrentUser(suppliedClient as never)).resolves.toBeNull();

    expect(getUser).toHaveBeenCalledOnce();
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });
});
