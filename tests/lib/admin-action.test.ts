import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const getCurrentUser = vi.fn();
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual, getCurrentUser: () => getCurrentUser() };
});

import { defineAdminAction, toFormAction } from "@/lib/auth/admin-action";

// Block body on purpose: `() => getCurrentUser.mockReset()` returns the mock, and
// Vitest treats a function returned from beforeEach as a teardown callback — so it
// would call the mock again after every test, re-throwing any implementation that
// throws.
beforeEach(() => {
  getCurrentUser.mockReset();
});

describe("defineAdminAction", () => {
  it("rejects an anonymous caller before running the handler", async () => {
    getCurrentUser.mockResolvedValue(null);
    const handler = vi.fn();
    const action = defineAdminAction({ role: "staff" }, handler);
    const result = await action(undefined);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("permissão") });
    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects a caller whose role is below the minimum", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "c@x.com", role: "client" });
    const handler = vi.fn();
    const action = defineAdminAction({ role: "staff" }, handler);
    const result = await action(undefined);
    expect(result.ok).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns fieldErrors for invalid input without running the handler", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "s@x.com", role: "staff" });
    const handler = vi.fn();
    const action = defineAdminAction(
      { role: "staff", input: z.object({ name: z.string().min(1) }) },
      handler,
    );
    const result = await action({ name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.name).toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the handler with parsed input and the user on success", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "s@x.com", role: "admin" });
    const action = defineAdminAction(
      { role: "staff", input: z.object({ n: z.coerce.number() }) },
      async (input, ctx) => ({ doubled: input.n * 2, by: ctx.user.id }),
    );
    const result = await action({ n: "21" });
    expect(result).toEqual({ ok: true, data: { doubled: 42, by: "u1" } });
  });

  it("returns ActionResult (not a rejection) when getCurrentUser itself throws", async () => {
    // Supabase down, or the profiles query failing: the caller's `result.ok`
    // contract must still hold — every form does `if (result.ok)`, and a rejected
    // promise there is an unhandled server-action error, not a form error.
    getCurrentUser.mockImplementation(async () => {
      throw new Error("supabase unreachable");
    });
    const handler = vi.fn();
    const action = defineAdminAction({ role: "staff" }, handler);
    const result = await action(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toContain("supabase");
    expect(handler).not.toHaveBeenCalled();
  });

  it("catches a handler throw and returns a generic error", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "s@x.com", role: "staff" });
    const action = defineAdminAction({ role: "staff" }, async () => {
      throw new Error("db exploded");
    });
    const result = await action(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toContain("db exploded");
  });
});

describe("toFormAction", () => {
  it("drops empty strings, coerces declared numbers, and treats declared booleans as presence", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", email: "s@x.com", role: "staff" });
    const seen: unknown[] = [];
    const action = defineAdminAction({ role: "staff" }, async () => null);
    // wrap a spy so we can see the raw object toFormAction built
    const spy = async (raw: unknown) => {
      seen.push(raw);
      return action(undefined);
    };
    const formAction = toFormAction(spy, { numbers: ["count"], booleans: ["consent"] });
    const fd = new FormData();
    fd.set("name", "Maria");
    fd.set("phone", "");
    fd.set("count", "3");
    fd.set("consent", "on");
    await formAction(null, fd);
    expect(seen[0]).toEqual({ name: "Maria", count: 3, consent: true });
  });

  it("marks an absent declared boolean as false", async () => {
    const seen: unknown[] = [];
    const formAction = toFormAction(
      async (raw) => {
        seen.push(raw);
        return { ok: true as const, data: null };
      },
      { booleans: ["consent"] },
    );
    await formAction(null, new FormData());
    expect(seen[0]).toEqual({ consent: false });
  });
});
