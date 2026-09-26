// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalRequestContext: vi.fn(),
  readClientReviewPrompt: vi.fn(),
  recordReviewLinkOpened: vi.fn(),
  rememberReviewPromptDismissed: vi.fn(),
}));

vi.mock("@/domain/portal/server", () => ({ getPortalRequestContext: mocks.getPortalRequestContext }));
vi.mock("@/domain/reviews/portal", () => ({
  readClientReviewPrompt: mocks.readClientReviewPrompt,
  recordReviewLinkOpened: mocks.recordReviewLinkOpened,
}));
vi.mock("@/domain/reviews/portal-server", () => ({
  rememberReviewPromptDismissed: mocks.rememberReviewPromptDismissed,
}));

import {
  dismissReviewPromptAction,
  openReviewLinkAction,
} from "@/app/(client)/minha-experiencia/avaliacao/actions";
import { PortalReadError } from "@/domain/portal/read";

const shootId = "00000000-0000-4000-8000-00000000e201";
const context = { client: { id: "client-1", name: "Mariana" }, viewerAuthUserId: "auth-1", shoot: null };

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getPortalRequestContext.mockResolvedValue(context);
});

describe("openReviewLinkAction (SCL-721)", () => {
  it("records the open for the session's client and stops showing the card", async () => {
    mocks.recordReviewLinkOpened.mockResolvedValue({ recorded: true, shootId });

    await expect(openReviewLinkAction()).resolves.toEqual({ ok: true, data: { recorded: true } });
    expect(mocks.recordReviewLinkOpened).toHaveBeenCalledWith({ clientId: "client-1", authUserId: "auth-1" });
    expect(mocks.rememberReviewPromptDismissed).toHaveBeenCalledWith(shootId);
  });

  it("does nothing else when the card is no longer offered", async () => {
    mocks.recordReviewLinkOpened.mockResolvedValue({ recorded: false, shootId: null });

    await expect(openReviewLinkAction()).resolves.toEqual({ ok: true, data: { recorded: false } });
    expect(mocks.rememberReviewPromptDismissed).not.toHaveBeenCalled();
  });

  it("asks to sign in again when the session expired and hides internal errors", async () => {
    mocks.getPortalRequestContext.mockRejectedValueOnce(new PortalReadError("unauthenticated"));
    await expect(openReviewLinkAction()).resolves.toEqual({ ok: false, error: "Sua sessão expirou. Entre novamente." });

    mocks.recordReviewLinkOpened.mockRejectedValueOnce(new Error("insert failed"));
    const result = await openReviewLinkAction();
    expect(result).toEqual({ ok: false, error: "Não foi possível registrar agora. Tente novamente." });
  });
});

describe("dismissReviewPromptAction (SCL-721)", () => {
  it("remembers the dismissal for the shoot derived from the session", async () => {
    mocks.readClientReviewPrompt.mockResolvedValue({ shootId, reviewUrl: "https://g.page/r/x/review" });

    await expect(dismissReviewPromptAction()).resolves.toEqual({ ok: true, data: { dismissed: true } });
    expect(mocks.readClientReviewPrompt).toHaveBeenCalledWith("client-1");
    expect(mocks.rememberReviewPromptDismissed).toHaveBeenCalledWith(shootId);
    expect(mocks.recordReviewLinkOpened).not.toHaveBeenCalled();
  });

  it("is a no-op when there is no card", async () => {
    mocks.readClientReviewPrompt.mockResolvedValue(null);

    await expect(dismissReviewPromptAction()).resolves.toEqual({ ok: true, data: { dismissed: false } });
    expect(mocks.rememberReviewPromptDismissed).not.toHaveBeenCalled();
  });
});
