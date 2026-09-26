// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalRequestContext: vi.fn(),
  readClientReviewPrompt: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookieGet, set: mocks.cookieSet }),
}));
vi.mock("@/domain/portal/server", () => ({ getPortalRequestContext: mocks.getPortalRequestContext }));
vi.mock("@/domain/reviews/portal", () => ({ readClientReviewPrompt: mocks.readClientReviewPrompt }));

import {
  getPortalReviewPrompt,
  rememberReviewPromptDismissed,
  REVIEW_PROMPT_DISMISSED_COOKIE,
} from "@/domain/reviews/portal-server";

const shootId = "00000000-0000-4000-8000-00000000e101";
const prompt = { shootId, reviewUrl: "https://g.page/r/studio-carol-lucas/review" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getPortalRequestContext.mockResolvedValue({
    client: { id: "client-1", name: "Mariana" },
    viewerAuthUserId: "auth-1",
    shoot: null,
  });
});

describe("getPortalReviewPrompt (SCL-721)", () => {
  it("reads the card for the client of the session", async () => {
    mocks.readClientReviewPrompt.mockResolvedValue(prompt);

    await expect(getPortalReviewPrompt()).resolves.toEqual(prompt);
    expect(mocks.readClientReviewPrompt).toHaveBeenCalledWith("client-1");
    expect(mocks.cookieGet).toHaveBeenCalledWith(REVIEW_PROMPT_DISMISSED_COOKIE);
  });

  it("hides the card dismissed for this shoot, but not a card for another shoot", async () => {
    mocks.readClientReviewPrompt.mockResolvedValue(prompt);
    mocks.cookieGet.mockReturnValueOnce({ name: REVIEW_PROMPT_DISMISSED_COOKIE, value: shootId });
    await expect(getPortalReviewPrompt()).resolves.toBeNull();

    mocks.cookieGet.mockReturnValueOnce({ name: REVIEW_PROMPT_DISMISSED_COOKIE, value: "older-shoot" });
    await expect(getPortalReviewPrompt()).resolves.toEqual(prompt);
  });

  it("never breaks the page: a failed read hides the card", async () => {
    mocks.readClientReviewPrompt.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(getPortalReviewPrompt()).resolves.toBeNull();
  });
});

describe("rememberReviewPromptDismissed (SCL-721)", () => {
  it("stores only the shoot id in an httpOnly cookie scoped to the portal", async () => {
    await rememberReviewPromptDismissed(shootId);

    expect(mocks.cookieSet).toHaveBeenCalledWith(
      REVIEW_PROMPT_DISMISSED_COOKIE,
      shootId,
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/minha-experiencia", maxAge: 60 * 60 * 24 * 180 }),
    );
  });
});
