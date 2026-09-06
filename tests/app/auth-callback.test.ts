import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient, linkAuthUserToClient, loggerWarn, supabase } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  linkAuthUserToClient: vi.fn(),
  loggerWarn: vi.fn(),
  supabase: {
    auth: {
      exchangeCodeForSession: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient }));
vi.mock("@/lib/auth/client-link", () => ({ linkAuthUserToClient }));
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: loggerWarn } }));

import { GET } from "@/app/auth/callback/route";

const USER = { id: "00000000-0000-4000-8000-000000000001", email: "maria@example.com" };

function request() {
  return new Request("https://studio.test/auth/callback?code=verified&redirect=/minha-experiencia/checklist");
}

function expectAccessDenied(response: Response) {
  expect(response.headers.get("location")).toBe("https://studio.test/login?error=access");
}

beforeEach(() => {
  createSupabaseServerClient.mockReset().mockResolvedValue(supabase);
  linkAuthUserToClient.mockReset();
  loggerWarn.mockReset();
  supabase.auth.exchangeCodeForSession.mockReset().mockResolvedValue({ data: { session: null, user: null }, error: null });
  supabase.auth.getUser.mockReset().mockResolvedValue({ data: { user: USER }, error: null });
  supabase.auth.signOut.mockReset().mockResolvedValue({ error: null });
});

describe("GET /auth/callback", () => {
  it("redirects only after a successful authorized link", async () => {
    const response = await GET(request());

    expect(linkAuthUserToClient).toHaveBeenCalledWith(USER);
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://studio.test/minha-experiencia/checklist");
  });

  it("signs out and returns a neutral error when linking is denied", async () => {
    linkAuthUserToClient.mockRejectedValue(new Error("no CRM match"));

    const response = await GET(request());

    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    expectAccessDenied(response);
    expect(response.headers.get("location")).not.toContain("CRM");
  });

  it("signs out and returns a neutral error when linking throws", async () => {
    linkAuthUserToClient.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(request());

    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    expectAccessDenied(response);
  });

  it("signs out when Auth returns no user", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await GET(request());

    expect(linkAuthUserToClient).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    expectAccessDenied(response);
  });

  it("signs out when the Auth user has no email", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: USER.id, email: undefined } }, error: null });

    const response = await GET(request());

    expect(linkAuthUserToClient).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    expectAccessDenied(response);
  });

  it("signs out when Auth cannot return the user", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("auth upstream unavailable") });

    const response = await GET(request());

    expect(linkAuthUserToClient).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    expectAccessDenied(response);
  });
});
