// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  decideReviewRequestDelivery,
  isReviewPromptDue,
  isReviewRequestDue,
  REVIEW_REQUEST_DELAY_DAYS,
  REVIEW_REQUEST_MAX_DAYS,
  reviewRequestIdempotencyKey,
  type ReviewRequestCandidate,
} from "@/domain/automation/flows/rules";

const delivered: ReviewRequestCandidate = {
  shootStatus: "entregue",
  productionStatus: "entregue",
  deliveryAt: "2026-10-01",
  galleryStatus: "published",
};

describe("post-delivery review rule (SCL-704/SCL-721)", () => {
  it("waits the delay after the delivery date (studio calendar)", () => {
    expect(REVIEW_REQUEST_DELAY_DAYS).toBe(3);
    expect(isReviewRequestDue(delivered, "2026-10-03")).toBe(false);
    expect(isReviewRequestDue(delivered, "2026-10-04")).toBe(true);
    expect(isReviewPromptDue(delivered, "2026-10-03")).toBe(false);
    expect(isReviewPromptDue(delivered, "2026-10-04")).toBe(true);
  });

  it("only emails inside the window, while the portal card has no ceiling", () => {
    expect(REVIEW_REQUEST_MAX_DAYS).toBe(30);
    expect(isReviewRequestDue(delivered, "2026-10-31")).toBe(true);
    expect(isReviewRequestDue(delivered, "2026-11-01")).toBe(false);
    expect(isReviewPromptDue(delivered, "2027-03-01")).toBe(true);
  });

  it("requires a delivered production job with a date and a published Reveal", () => {
    for (const candidate of [
      { ...delivered, productionStatus: "finalizado" },
      { ...delivered, productionStatus: null },
      { ...delivered, deliveryAt: null },
      { ...delivered, deliveryAt: "01/10/2026" },
      { ...delivered, galleryStatus: "draft" },
      { ...delivered, galleryStatus: null },
    ]) {
      expect(isReviewRequestDue(candidate, "2026-10-10")).toBe(false);
      expect(isReviewPromptDue(candidate, "2026-10-10")).toBe(false);
    }
  });

  it("never asks about a cancelled shoot, whatever the production state", () => {
    const cancelled = { ...delivered, shootStatus: "cancelado" };
    expect(isReviewRequestDue(cancelled, "2026-10-10")).toBe(false);
    expect(isReviewPromptDue(cancelled, "2026-10-10")).toBe(false);
    // The shoot status only mirrors the delivery when its state machine allows it.
    expect(isReviewRequestDue({ ...delivered, shootStatus: "reveal" }, "2026-10-10")).toBe(true);
  });

  it("keys the outbox event per shoot and destination", () => {
    expect(reviewRequestIdempotencyKey("00000000-0000-4000-8000-00000000ABCD")).toBe(
      "review.requested:00000000-0000-4000-8000-00000000abcd:google",
    );
  });

  it("sends only while the review is still requested and the link is configured", () => {
    expect(decideReviewRequestDelivery({ review: { status: "solicitado" }, reviewUrlConfigured: true })).toEqual({
      send: true,
    });
    expect(decideReviewRequestDelivery({ review: { status: "concluido" }, reviewUrlConfigured: true })).toEqual({
      send: false,
      reason: "avaliação já concluída",
    });
    expect(decideReviewRequestDelivery({ review: { status: "cancelado" }, reviewUrlConfigured: true })).toEqual({
      send: false,
      reason: "pedido de avaliação cancelado",
    });
    expect(decideReviewRequestDelivery({ review: null, reviewUrlConfigured: true })).toEqual({
      send: false,
      reason: "avaliação inexistente",
    });
    expect(decideReviewRequestDelivery({ review: { status: "solicitado" }, reviewUrlConfigured: false })).toEqual({
      send: false,
      reason: "link de avaliação não configurado",
    });
  });
});
