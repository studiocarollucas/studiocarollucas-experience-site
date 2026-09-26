import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openReviewLinkAction: vi.fn(),
  dismissReviewPromptAction: vi.fn(),
}));

vi.mock("@/app/(client)/minha-experiencia/avaliacao/actions", () => ({
  openReviewLinkAction: mocks.openReviewLinkAction,
  dismissReviewPromptAction: mocks.dismissReviewPromptAction,
}));

import { ReviewPrompt } from "@/components/client/review-prompt";

const reviewUrl = "https://g.page/r/studio-carol-lucas/review";

describe("ReviewPrompt (SCL-721)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // jsdom reports hyperlink navigation as "not implemented".
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.openReviewLinkAction.mockResolvedValue({ ok: true, data: { recorded: true } });
    mocks.dismissReviewPromptAction.mockResolvedValue({ ok: true, data: { dismissed: true } });
  });

  it("is an inline, optional invitation that opens Google in a new tab", () => {
    render(<ReviewPrompt reviewUrl={reviewUrl} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Conte como foi a sua experiência" })).toBeInTheDocument();
    expect(screen.getByText(/É opcional/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Avaliar no Google/ });
    expect(link).toHaveAttribute("href", reviewUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("records the open without any client data from the browser and thanks the client", () => {
    render(<ReviewPrompt reviewUrl={reviewUrl} />);

    fireEvent.click(screen.getByRole("link", { name: /Avaliar no Google/ }));

    expect(mocks.openReviewLinkAction).toHaveBeenCalledWith();
    expect(screen.getByRole("heading", { name: "Obrigada pelo carinho" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("can be dismissed right away", () => {
    render(<ReviewPrompt reviewUrl={reviewUrl} />);

    fireEvent.click(screen.getByRole("button", { name: "Agora não" }));

    expect(mocks.dismissReviewPromptAction).toHaveBeenCalledWith();
    expect(mocks.openReviewLinkAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("stays usable when recording fails", () => {
    mocks.dismissReviewPromptAction.mockRejectedValue(new Error("offline"));
    render(<ReviewPrompt reviewUrl={reviewUrl} />);

    fireEvent.click(screen.getByRole("button", { name: "Agora não" }));

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
