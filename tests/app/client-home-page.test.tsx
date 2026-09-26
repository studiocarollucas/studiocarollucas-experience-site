import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  getPortalReviewPrompt: vi.fn(),
}));

vi.mock("@/domain/portal/server", () => ({ getPortalHomeData: mocks.getPortalHomeData }));
vi.mock("@/domain/reviews/portal-server", () => ({ getPortalReviewPrompt: mocks.getPortalReviewPrompt }));
vi.mock("@/app/(client)/minha-experiencia/avaliacao/actions", () => ({
  openReviewLinkAction: vi.fn(),
  dismissReviewPromptAction: vi.fn(),
}));

import ClientHome from "@/app/(client)/minha-experiencia/page";

describe("ClientHome", () => {
  beforeEach(() => {
    mocks.getPortalHomeData.mockClear();
    mocks.getPortalReviewPrompt.mockReset();
    mocks.getPortalReviewPrompt.mockResolvedValue(null);
  });

  it("reads only the home section and leaves main to the layout", async () => {
    render(await ClientHome());

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Minha Experiência" })).toBeInTheDocument();
    expect(mocks.getPortalHomeData).toHaveBeenCalledOnce();
    expect(screen.queryByRole("link", { name: /Avaliar no Google/ })).not.toBeInTheDocument();
  });

  it("adds the dismissible review card after the journey once the shoot was delivered (SCL-721)", async () => {
    mocks.getPortalReviewPrompt.mockResolvedValue({
      shootId: "shoot-1",
      reviewUrl: "https://g.page/r/studio-carol-lucas/review",
    });

    render(await ClientHome());

    expect(screen.getByRole("region", { name: "Minha Experiência" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Avaliar no Google/ })).toHaveAttribute(
      "href",
      "https://g.page/r/studio-carol-lucas/review",
    );
    expect(screen.getByRole("button", { name: "Agora não" })).toBeInTheDocument();
  });
});
