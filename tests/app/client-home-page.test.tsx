import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalHomeData: vi.fn(async () => ({
    snapshot: {
      client: { id: "client-1", name: "Mariana" },
      viewerAuthUserId: "auth-1",
      shoot: null,
      experience: null,
      tasks: [],
      payments: [],
      references: [],
    },
    today: "2026-09-06",
  })),
}));

vi.mock("@/domain/portal/server", () => ({ getPortalHomeData: mocks.getPortalHomeData }));

import ClientHome from "@/app/(client)/minha-experiencia/page";

describe("ClientHome", () => {
  it("reads only the home section and leaves main to the layout", async () => {
    render(await ClientHome());

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Minha Experiência" })).toBeInTheDocument();
    expect(mocks.getPortalHomeData).toHaveBeenCalledOnce();
  });
});
