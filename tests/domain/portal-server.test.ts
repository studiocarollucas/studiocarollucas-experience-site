import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  readPortalContext: vi.fn(),
  readPortalHomeSnapshot: vi.fn(),
  studioDate: vi.fn(() => "2026-09-07"),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) => {
      let result: TResult | undefined;
      return (...args: TArgs) => (result ??= fn(...args));
    },
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/domain/portal/read", () => ({
  readPortalChecklistSnapshot: vi.fn(),
  readPortalContext: mocks.readPortalContext,
  readPortalHomeSnapshot: mocks.readPortalHomeSnapshot,
  readPortalShootSnapshot: vi.fn(),
  readPortalStylingSnapshot: vi.fn(),
}));
vi.mock("@/domain/portal/countdown", () => ({ studioDate: mocks.studioDate }));

describe("portal server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("memoizes authenticated client context across layout and home reads", async () => {
    const supabase = { source: "cookie-jwt" };
    const context = {
      client: { id: "client-1", name: "Mariana" },
      viewerAuthUserId: "auth-1",
      shoot: null,
    };
    mocks.createSupabaseServerClient.mockResolvedValue(supabase);
    mocks.readPortalContext.mockResolvedValue(context);
    mocks.readPortalHomeSnapshot.mockResolvedValue({ client: context.client });

    const { getPortalHomeData, getPortalRequestContext } = await import("@/domain/portal/server");
    await getPortalRequestContext();
    await getPortalHomeData();

    expect(mocks.createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(mocks.readPortalContext).toHaveBeenCalledOnce();
    expect(mocks.readPortalHomeSnapshot).toHaveBeenCalledWith(
      supabase,
      expect.any(Date),
      context,
    );
  });
});
