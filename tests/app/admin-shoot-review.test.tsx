import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => {
  class ReviewError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ReviewError";
    }
  }
  return {
    ReviewError,
    getCurrentUser: vi.fn(),
    completeReview: vi.fn(),
    cancelReview: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/reviews/service", () => ({
  ReviewError: mocks.ReviewError,
  completeReview: mocks.completeReview,
  cancelReview: mocks.cancelReview,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  cancelShootReviewAction,
  completeShootReviewAction,
} from "@/app/admin/(protected)/agenda/[id]/review-actions";
import { ShootReview } from "@/components/admin/shoot-review";

const shootId = "00000000-0000-4000-8000-00000000f501";
const reviewId = "00000000-0000-4000-8000-00000000f502";
const actorUserId = "00000000-0000-4000-8000-00000000f503";

describe("Shoot review actions (SCL-721)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: actorUserId, role: "staff" });
    mocks.completeReview.mockResolvedValue({ review: { id: reviewId }, changed: true });
    mocks.cancelReview.mockResolvedValue({ review: { id: reviewId }, changed: true });
  });

  it("completes the review with the session user as actor and refreshes the shoot page", async () => {
    await expect(completeShootReviewAction({ shootId, reviewId, actorUserId: "forged" })).resolves.toEqual({
      ok: true,
      data: { reviewId },
    });
    expect(mocks.completeReview).toHaveBeenCalledWith({ reviewId }, actorUserId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/agenda/${shootId}`);
  });

  it("cancels the request with the session user as actor", async () => {
    await expect(cancelShootReviewAction({ shootId, reviewId })).resolves.toEqual({ ok: true, data: { reviewId } });
    expect(mocks.cancelReview).toHaveBeenCalledWith({ reviewId }, actorUserId);
  });

  it("requires a staff session and valid ids", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "client-user", role: "client" });
    await expect(completeShootReviewAction({ shootId, reviewId })).resolves.toMatchObject({ ok: false });
    await expect(cancelShootReviewAction({ shootId, reviewId })).resolves.toMatchObject({ ok: false });

    mocks.getCurrentUser.mockResolvedValue({ id: actorUserId, role: "staff" });
    await expect(completeShootReviewAction({ shootId, reviewId: "x" })).resolves.toMatchObject({ ok: false });
    expect(mocks.completeReview).not.toHaveBeenCalled();
    expect(mocks.cancelReview).not.toHaveBeenCalled();
  });

  it("shows review rule violations as actionable messages", async () => {
    mocks.completeReview.mockRejectedValue(new mocks.ReviewError("Avaliação cancelada não pode ser concluída."));
    await expect(completeShootReviewAction({ shootId, reviewId })).resolves.toEqual({
      ok: false,
      error: "Avaliação cancelada não pode ser concluída.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("ShootReview panel (SCL-721)", () => {
  it("explains the automatic request when there is none yet", () => {
    render(<ShootReview shootId={shootId} panel={{ review: null, linkOpenedAt: null }} />);

    expect(screen.getByText(/Nenhum pedido de avaliação no Google/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("tracks request, link open and offers completion or cancellation while requested", () => {
    render(
      <ShootReview
        shootId={shootId}
        panel={{
          review: {
            id: reviewId,
            status: "solicitado",
            source: "automacao",
            requestedAt: "2026-10-08T14:00:00.000Z",
            completedAt: null,
          },
          linkOpenedAt: "2026-10-09T13:30:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("solicitada")).toBeInTheDocument();
    expect(screen.getByText("e-mail automático")).toBeInTheDocument();
    expect(screen.getByText("Cliente abriu o link")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como concluída" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar pedido" })).toBeInTheDocument();
  });

  it("is read-only once completed", () => {
    render(
      <ShootReview
        shootId={shootId}
        panel={{
          review: {
            id: reviewId,
            status: "concluido",
            source: "portal",
            requestedAt: "2026-10-08T14:00:00.000Z",
            completedAt: "2026-10-10T12:00:00.000Z",
          },
          linkOpenedAt: null,
        }}
      />,
    );

    expect(screen.getByText("concluída")).toBeInTheDocument();
    expect(screen.getByText("Minha Experiência")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
