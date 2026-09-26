// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestReviewInTransaction: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/domain/reviews/service", () => ({ requestReviewInTransaction: mocks.requestReviewInTransaction }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import { readClientReviewPrompt, recordReviewLinkOpened } from "@/domain/reviews/portal";

const clientId = "00000000-0000-4000-8000-00000000d101";
const authUserId = "00000000-0000-4000-8000-00000000d102";
const shootId = "00000000-0000-4000-8000-00000000d103";
const reviewId = "00000000-0000-4000-8000-00000000d104";
const reviewUrl = "https://g.page/r/studio-carol-lucas/review";
// 2026-10-10 in Manaus.
const now = new Date("2026-10-10T15:00:00.000Z");

const deliveredShoot = {
  shootId,
  shootStatus: "entregue",
  productionStatus: "entregue",
  deliveryAt: "2026-10-05",
  galleryStatus: "published",
};

type SelectChain = {
  from: () => SelectChain;
  innerJoin: () => SelectChain;
  where: () => SelectChain;
  orderBy: () => SelectChain;
  limit: () => Promise<unknown[]>;
};

/** Each `limit()` answers one query, in order: latest delivered shoot, then closed Reviews. */
function fakeDatabase(results: unknown[][]) {
  const queue = [...results];
  const chain: SelectChain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(queue.shift() ?? [])),
  };
  const tx = { kind: "tx" };
  const select = vi.fn(() => chain);
  const transaction = vi.fn(async (operation: (transaction: unknown) => Promise<unknown>) => operation(tx));
  return {
    database: { select, transaction } as unknown as NonNullable<Parameters<typeof recordReviewLinkOpened>[1]>,
    select,
    transaction,
    tx,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.recordAuditEvent.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readClientReviewPrompt (SCL-721)", () => {
  it("offers the card for the latest delivered shoot once the delay has passed", async () => {
    const fake = fakeDatabase([[deliveredShoot], []]);

    await expect(readClientReviewPrompt(clientId, { now, database: fake.database, reviewUrl })).resolves.toEqual({
      shootId,
      reviewUrl,
    });
    expect(fake.select).toHaveBeenCalledTimes(2);
  });

  it("stays hidden before the delay, without a delivered shoot or when the Review is completed/cancelled", async () => {
    const early = fakeDatabase([[{ ...deliveredShoot, deliveryAt: "2026-10-08" }]]);
    const none = fakeDatabase([[]]);
    const closed = fakeDatabase([[deliveredShoot], [{ id: reviewId }]]);

    for (const fake of [early, none, closed]) {
      await expect(readClientReviewPrompt(clientId, { now, database: fake.database, reviewUrl })).resolves.toBeNull();
    }
    expect(early.select).toHaveBeenCalledOnce();
  });

  it("does not query anything without a configured link", async () => {
    vi.stubEnv("STUDIO_GOOGLE_REVIEW_URL", "");
    const fake = fakeDatabase([[deliveredShoot], []]);

    await expect(readClientReviewPrompt(clientId, { now, database: fake.database })).resolves.toBeNull();
    expect(fake.select).not.toHaveBeenCalled();
  });
});

describe("recordReviewLinkOpened (SCL-721)", () => {
  beforeEach(() => {
    vi.stubEnv("STUDIO_GOOGLE_REVIEW_URL", reviewUrl);
  });

  it("ensures the shoot's Google Review and audits the open with the client as actor, in one transaction", async () => {
    const fake = fakeDatabase([[deliveredShoot], []]);
    mocks.requestReviewInTransaction.mockResolvedValue({ review: { id: reviewId, status: "solicitado" }, created: true });

    await expect(recordReviewLinkOpened({ clientId, authUserId, now }, fake.database)).resolves.toEqual({
      recorded: true,
      shootId,
    });
    expect(mocks.requestReviewInTransaction).toHaveBeenCalledWith(
      fake.tx,
      { clientId, shootId, source: "portal", target: "google", targetUrl: reviewUrl },
      authUserId,
    );
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      {
        actorUserId: authUserId,
        action: "review.link_opened",
        entityType: "review",
        entityId: reviewId,
        before: null,
        after: { shootId, target: "google", via: "portal" },
      },
      fake.tx,
    );
  });

  it("does not record when the card is no longer offered", async () => {
    const fake = fakeDatabase([[deliveredShoot], [{ id: reviewId }]]);

    await expect(recordReviewLinkOpened({ clientId, authUserId, now }, fake.database)).resolves.toEqual({
      recorded: false,
      shootId: null,
    });
    expect(fake.transaction).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("does not audit an open on a Review that is not requested anymore", async () => {
    const fake = fakeDatabase([[deliveredShoot], []]);
    mocks.requestReviewInTransaction.mockResolvedValue({ review: { id: reviewId, status: "concluido" }, created: false });

    await expect(recordReviewLinkOpened({ clientId, authUserId, now }, fake.database)).resolves.toEqual({
      recorded: false,
      shootId,
    });
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });
});
