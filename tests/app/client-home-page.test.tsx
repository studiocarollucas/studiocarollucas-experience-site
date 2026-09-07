import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(async () => ({ source: "cookie-jwt" })),
  readPortalSnapshot: vi.fn(async (supabase: unknown, now?: Date) => {
    void supabase;
    void now;
    return {
      client: { id: "client-1", name: "Mariana" },
      viewerAuthUserId: "auth-1",
      shoot: null,
      experience: null,
      tasks: [],
      payments: [],
      references: [],
    };
  }),
  studioDate: vi.fn((now?: Date) => {
    void now;
    return "2026-09-06";
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/domain/portal/read", () => ({ readPortalSnapshot: mocks.readPortalSnapshot }));
vi.mock("@/domain/portal/countdown", () => ({ studioDate: mocks.studioDate }));

import ClientHome from "@/app/(client)/minha-experiencia/page";

describe("ClientHome", () => {
  it("reads through the cookie-bound Supabase client and leaves main to the layout", async () => {
    render(await ClientHome());

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Minha Experiência" })).toBeInTheDocument();
    expect(mocks.createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(mocks.readPortalSnapshot).toHaveBeenCalledWith(
      { source: "cookie-jwt" },
      expect.any(Date)
    );
    expect(mocks.studioDate).toHaveBeenCalledOnce();
  });

  it("uses one captured instant for shoot selection and the studio calendar", async () => {
    await ClientHome();

    const selectionNow = mocks.readPortalSnapshot.mock.calls.at(-1)?.[1];
    const calendarNow = mocks.studioDate.mock.calls.at(-1)?.[0];

    expect(selectionNow).toBeInstanceOf(Date);
    expect(selectionNow).toBe(calendarNow);
  });
});
