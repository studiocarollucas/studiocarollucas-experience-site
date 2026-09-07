import { describe, expect, it } from "vitest";
import { assertAuthUserAbsent } from "./live-auth-cleanup";

describe("assertAuthUserAbsent", () => {
  it("accepts only the real Supabase user-not-found response", () => {
    expect(() =>
      assertAuthUserAbsent("user-1", {
        data: { user: null },
        error: { name: "AuthApiError", code: "user_not_found", status: 404 },
      }),
    ).not.toThrow();
  });

  it.each([
    [
      "network failure",
      {
        data: { user: null },
        error: { name: "AuthRetryableFetchError", code: undefined, status: 0 },
      },
    ],
    [
      "permission failure",
      { data: { user: null }, error: { name: "AuthApiError", code: "not_admin", status: 403 } },
    ],
    [
      "wrong error kind",
      {
        data: { user: null },
        error: { name: "AuthRetryableFetchError", code: "user_not_found", status: 404 },
      },
    ],
    ["ambiguous null", { data: { user: null }, error: null }],
    ["existing user", { data: { user: { id: "user-1" } }, error: null }],
  ])("rejects %s", (_label, result) => {
    expect(() => assertAuthUserAbsent("user-1", result)).toThrow(
      "Auth user cleanup could not be verified: user-1",
    );
  });
});
