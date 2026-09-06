import { describe, expect, it } from "vitest";
import { decideClientLink, normalizeClientEmail } from "@/lib/auth/client-link";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ID = "00000000-0000-4000-8000-000000000002";

describe("client-link", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeClientEmail("  Maria@Example.COM ")).toBe("maria@example.com");
  });

  it("requests a link for one unlinked client", () => {
    expect(decideClientLink([{ id: "client-1", authUserId: null }], USER_ID)).toEqual({
      kind: "link",
      clientId: "client-1",
    });
  });

  it("accepts an idempotent existing link", () => {
    expect(decideClientLink([{ id: "client-1", authUserId: USER_ID }], USER_ID)).toEqual({
      kind: "linked",
      clientId: "client-1",
    });
  });

  it.each([
    [[], "no_match"],
    [[{ id: "a", authUserId: null }, { id: "b", authUserId: null }], "ambiguous"],
    [[{ id: "a", authUserId: OTHER_ID }], "owned_by_another_user"],
  ] as const)("denies unsafe link candidates", (matches, reason) => {
    expect(decideClientLink([...matches], USER_ID)).toEqual({ kind: "denied", reason });
  });
});
