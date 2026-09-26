// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { transaction: mocks.transaction, select: mocks.select } }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import {
  cancelReview,
  completeReview,
  requestReview,
  requestReviewInTransaction,
  ReviewError,
} from "@/domain/reviews/service";

const CLIENT_ID = "00000000-0000-4000-8000-000000000101";
const OTHER_CLIENT_ID = "00000000-0000-4000-8000-000000000102";
const SHOOT_ID = "00000000-0000-4000-8000-000000000103";
const REVIEW_ID = "00000000-0000-4000-8000-000000000104";
const ACTOR_ID = "00000000-0000-4000-8000-000000000105";

const requestedAt = new Date("2026-09-20T12:00:00.000Z");

function review(overrides: Record<string, unknown> = {}) {
  return {
    id: REVIEW_ID,
    clientId: CLIENT_ID,
    shootId: SHOOT_ID,
    status: "solicitado",
    source: "manual",
    target: "google",
    targetUrl: null,
    requestedAt,
    completedAt: null,
    createdAt: requestedAt,
    updatedAt: requestedAt,
    ...overrides,
  };
}

/** Each queued result answers one `tx.select(...)...` chain, in order. */
function makeTx(selectResults: unknown[][], insertResult: unknown[] = [], updateResult: unknown[] = []) {
  const queue = [...selectResults];
  const next = () => Promise.resolve(queue.shift() ?? []);
  const limit = vi.fn().mockImplementation(() => {
    const result = next();
    return Object.assign(result, { for: vi.fn().mockImplementation(() => result) });
  });
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const insertReturning = vi.fn().mockResolvedValue(insertResult);
  const onConflictDoNothing = vi.fn().mockReturnValue({ returning: insertReturning });
  const values = vi.fn().mockReturnValue({ onConflictDoNothing });
  const updateReturning = vi.fn().mockResolvedValue(updateResult);
  const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
  const set = vi.fn().mockReturnValue({ where: updateWhere });
  const tx = {
    select: vi.fn().mockReturnValue({ from }),
    insert: vi.fn().mockReturnValue({ values }),
    update: vi.fn().mockReturnValue({ set }),
  };
  mocks.transaction.mockImplementation(async (operation: (tx: unknown) => unknown) => operation(tx));
  return { tx, values, onConflictDoNothing, set };
}

describe("requestReview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("rejects invalid input before opening a transaction", async () => {
    await expect(
      requestReview({ clientId: "x", source: "manual" } as never, ACTOR_ID),
    ).rejects.toThrow();
    await expect(
      requestReview({ clientId: CLIENT_ID, source: "manual", targetUrl: "http://example.test" }, ACTOR_ID),
    ).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a Shoot that belongs to another Client", async () => {
    const { tx } = makeTx([[{ id: CLIENT_ID }], [{ clientId: OTHER_CLIENT_ID }]]);

    await expect(
      requestReview({ clientId: CLIENT_ID, shootId: SHOOT_ID, source: "manual" }, ACTOR_ID),
    ).rejects.toThrow(new ReviewError("O ensaio não pertence a esta cliente."));
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("rejects an unknown Client", async () => {
    const { tx } = makeTx([[]]);

    await expect(requestReview({ clientId: CLIENT_ID, source: "manual" }, ACTOR_ID)).rejects.toThrow(
      "Cliente inexistente.",
    );
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("records a requested review for the Client's Shoot and audits it in the transaction", async () => {
    const created = review();
    const { tx, values, onConflictDoNothing } = makeTx([[{ id: CLIENT_ID }], [{ clientId: CLIENT_ID }]], [created]);

    await expect(
      requestReview({ clientId: CLIENT_ID, shootId: SHOOT_ID, source: "automacao" }, ACTOR_ID),
    ).resolves.toEqual({ review: created, created: true });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: CLIENT_ID,
        shootId: SHOOT_ID,
        status: "solicitado",
        source: "automacao",
        target: "google",
        targetUrl: null,
        requestedAt: expect.any(Date),
      }),
    );
    expect(onConflictDoNothing).toHaveBeenCalled();
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: ACTOR_ID,
        action: "review.requested",
        entityType: "review",
        entityId: REVIEW_ID,
        before: null,
      }),
      tx,
    );
  });

  it("returns the active review of the same Shoot and target without auditing again", async () => {
    const existing = review({ status: "concluido", completedAt: new Date("2026-09-21T12:00:00.000Z") });
    makeTx([[{ id: CLIENT_ID }], [{ clientId: CLIENT_ID }], [existing]], []);

    await expect(
      requestReview({ clientId: CLIENT_ID, shootId: SHOOT_ID, source: "automacao" }, ACTOR_ID),
    ).resolves.toEqual({ review: existing, created: false });
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("requestReviewInTransaction (SCL-704)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("writes and audits with the caller's transaction without opening another one", async () => {
    const created = review({ source: "automacao", targetUrl: "https://g.page/r/studio/review" });
    const { tx, values } = makeTx([[{ id: CLIENT_ID }], [{ clientId: CLIENT_ID }]], [created]);

    await expect(
      requestReviewInTransaction(
        tx as never,
        {
          clientId: CLIENT_ID,
          shootId: SHOOT_ID,
          source: "automacao",
          target: "google",
          targetUrl: "https://g.page/r/studio/review",
        },
        null,
      ),
    ).resolves.toEqual({ review: created, created: true });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ source: "automacao", targetUrl: "https://g.page/r/studio/review" }),
    );
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, action: "review.requested", entityId: REVIEW_ID }),
      tx,
    );
  });
});

describe("completeReview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("completes a requested review and audits the transition", async () => {
    const completedAt = "2026-09-22T10:00:00.000Z";
    const updated = review({ status: "concluido", completedAt: new Date(completedAt) });
    const { tx, set } = makeTx([[review()]], [], [updated]);

    await expect(
      completeReview({ reviewId: REVIEW_ID, completedAt, targetUrl: "https://g.page/r/example" }, ACTOR_ID),
    ).resolves.toEqual({ review: updated, changed: true });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "concluido",
        completedAt: new Date(completedAt),
        targetUrl: "https://g.page/r/example",
        updatedAt: expect.any(Date),
      }),
    );
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "review.completed",
        entityType: "review",
        entityId: REVIEW_ID,
        before: expect.objectContaining({ status: "solicitado" }),
        after: expect.objectContaining({ status: "concluido" }),
      }),
      tx,
    );
  });

  it("is a no-op for an already completed review", async () => {
    const completed = review({ status: "concluido", completedAt: new Date("2026-09-21T12:00:00.000Z") });
    const { tx } = makeTx([[completed]]);

    await expect(completeReview({ reviewId: REVIEW_ID }, ACTOR_ID)).resolves.toEqual({
      review: completed,
      changed: false,
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects completing a cancelled review or completing before the request", async () => {
    makeTx([[review({ status: "cancelado" })]]);
    await expect(completeReview({ reviewId: REVIEW_ID }, ACTOR_ID)).rejects.toThrow(
      "Avaliação cancelada não pode ser concluída.",
    );

    const { tx } = makeTx([[review()]]);
    await expect(
      completeReview({ reviewId: REVIEW_ID, completedAt: "2026-09-19T12:00:00.000Z" }, ACTOR_ID),
    ).rejects.toThrow("A conclusão não pode ser anterior ao pedido.");
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("rejects a completion date in the future", async () => {
    await expect(
      completeReview({ reviewId: REVIEW_ID, completedAt: "2999-01-01T00:00:00.000Z" }, ACTOR_ID),
    ).rejects.toThrow("A conclusão não pode estar no futuro.");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("fails for an unknown review", async () => {
    makeTx([[]]);
    await expect(completeReview({ reviewId: REVIEW_ID }, ACTOR_ID)).rejects.toThrow("Avaliação inexistente.");
  });
});

describe("cancelReview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("cancels a requested review and audits it", async () => {
    const cancelled = review({ status: "cancelado" });
    const { tx, set } = makeTx([[review()]], [], [cancelled]);

    await expect(cancelReview({ reviewId: REVIEW_ID }, ACTOR_ID)).resolves.toEqual({ review: cancelled, changed: true });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "cancelado" }));
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "review.cancelled", entityId: REVIEW_ID }),
      tx,
    );
  });

  it("never cancels a completed review", async () => {
    const { tx } = makeTx([[review({ status: "concluido", completedAt: new Date() })]]);

    await expect(cancelReview({ reviewId: REVIEW_ID }, ACTOR_ID)).rejects.toThrow(
      "Avaliação concluída não pode ser cancelada.",
    );
    expect(tx.update).not.toHaveBeenCalled();
  });
});
