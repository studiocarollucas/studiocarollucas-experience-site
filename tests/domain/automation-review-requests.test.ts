// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueueAutomationEvent: vi.fn(),
  requestReviewInTransaction: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/domain/automation/events", () => ({ enqueueAutomationEvent: mocks.enqueueAutomationEvent }));
vi.mock("@/domain/reviews/service", () => ({ requestReviewInTransaction: mocks.requestReviewInTransaction }));

import { productionJobs } from "@/db/schema";
import {
  planReviewRequests,
  reviewRequestEventInput,
  scheduleReviewRequests,
  type ReviewRequestRow,
} from "@/domain/automation/flows/review-requests";
import { getLatestEmailTemplate } from "@/domain/automation/templates/registry";

const reviewUrl = "https://g.page/r/studio-carol-lucas/review";
// 2026-10-10 05:00 in Manaus — before the 10:00 local send time.
const earlyNow = new Date("2026-10-10T09:00:00.000Z");
// 2026-10-10 11:00 in Manaus — after it.
const lateNow = new Date("2026-10-10T15:00:00.000Z");
const sendAt = new Date("2026-10-10T14:00:00.000Z");

const shootA = "00000000-0000-4000-8000-00000000a701";
const shootB = "00000000-0000-4000-8000-00000000a702";
const clientA = "00000000-0000-4000-8000-00000000b701";
const clientB = "00000000-0000-4000-8000-00000000b702";
const reviewA = "00000000-0000-4000-8000-00000000c701";
const reviewB = "00000000-0000-4000-8000-00000000c702";

function row(overrides: Partial<ReviewRequestRow> = {}): ReviewRequestRow {
  return {
    shootId: shootA,
    clientId: clientA,
    shootStatus: "entregue",
    productionStatus: "entregue",
    deliveryAt: "2026-10-05",
    galleryStatus: "published",
    clientName: "Ana Beatriz",
    clientEmail: "Ana@Example.TEST",
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("planReviewRequests (SCL-704)", () => {
  it("plans one request per delivered shoot past the delay, with the normalized email", () => {
    const plan = planReviewRequests(
      [row(), row(), row({ shootId: shootB, clientId: clientB, clientName: "Bia", clientEmail: "bia@example.test" })],
      { now: earlyNow },
    );

    expect(plan).toEqual({
      requests: [
        { shootId: shootA, clientId: clientA, recipient: "ana@example.test", firstName: "Ana" },
        { shootId: shootB, clientId: clientB, recipient: "bia@example.test", firstName: "Bia" },
      ],
      notDue: 0,
      noEmail: 0,
    });
  });

  it("skips shoots not due and clients without a valid email", () => {
    const plan = planReviewRequests(
      [
        row({ shootId: "00000000-0000-4000-8000-00000000a711", deliveryAt: "2026-10-08" }),
        row({ shootId: "00000000-0000-4000-8000-00000000a712", deliveryAt: "2026-09-01" }),
        row({ shootId: "00000000-0000-4000-8000-00000000a713", galleryStatus: "draft" }),
        row({ shootId: "00000000-0000-4000-8000-00000000a714", shootStatus: "cancelado" }),
        row({ shootId: "00000000-0000-4000-8000-00000000a715", clientEmail: null }),
        row({ shootId: "00000000-0000-4000-8000-00000000a716", clientEmail: "invalido" }),
      ],
      { now: earlyNow },
    );

    expect(plan).toEqual({ requests: [], notDue: 4, noEmail: 2 });
  });

  it("builds the event keyed by shoot + Google, due at 10:00 in Manaus, with data the template accepts", () => {
    const [request] = planReviewRequests([row()], { now: earlyNow }).requests;
    const input = reviewRequestEventInput({ request, reviewId: reviewA, reviewUrl, now: earlyNow });

    expect(input).toEqual({
      eventType: "review.requested",
      entityType: "review",
      entityId: reviewA,
      idempotencyKey: `review.requested:${shootA}:google`,
      payload: { reviewId: reviewA, shootId: shootA, target: "google" },
      occurredAt: earlyNow,
      deliveries: [
        {
          templateKey: "pedido-avaliacao",
          recipient: "ana@example.test",
          data: { firstName: "Ana", reviewUrl },
          sendAt,
        },
      ],
    });
    expect(() => getLatestEmailTemplate("pedido-avaliacao").parse(input.deliveries[0].data)).not.toThrow();

    const late = reviewRequestEventInput({ request, reviewId: reviewA, reviewUrl, now: lateNow });
    expect(late.deliveries[0]).not.toHaveProperty("sendAt");
  });
});

type SelectChain = {
  innerJoin: () => SelectChain;
  leftJoin: () => SelectChain;
  where: () => Promise<ReviewRequestRow[]>;
};

function fakeDatabase(rows: ReviewRequestRow[]) {
  const tx = { kind: "tx" };
  const chain: SelectChain = {
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => Promise.resolve(rows)),
  };
  const select = vi.fn(() => ({
    from: (table: unknown) => {
      if (table !== productionJobs) throw new Error("unexpected table");
      return chain;
    },
  }));
  const transaction = vi.fn(async (operation: (transaction: unknown) => Promise<unknown>) => operation(tx));
  return {
    database: { select, transaction } as unknown as NonNullable<Parameters<typeof scheduleReviewRequests>[0]>["database"],
    select,
    transaction,
    tx,
    chain,
  };
}

describe("scheduleReviewRequests (SCL-704)", () => {
  it("does not read or write anything without a configured review link and warns once", async () => {
    vi.stubEnv("STUDIO_GOOGLE_REVIEW_URL", "");
    const fake = fakeDatabase([row(), row({ shootId: shootB })]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(scheduleReviewRequests({ now: earlyNow, database: fake.database })).resolves.toEqual({
      today: "2026-10-10",
      configured: false,
      candidates: 0,
      enqueued: 0,
      alreadyRequested: 0,
      notDue: 0,
      noEmail: 0,
      errors: 0,
    });
    expect(fake.select).not.toHaveBeenCalled();
    expect(fake.transaction).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).toContain("STUDIO_GOOGLE_REVIEW_URL");
  });

  it("reads the link from STUDIO_GOOGLE_REVIEW_URL by default", async () => {
    vi.stubEnv("STUDIO_GOOGLE_REVIEW_URL", reviewUrl);
    const fake = fakeDatabase([]);

    await expect(scheduleReviewRequests({ now: earlyNow, database: fake.database })).resolves.toMatchObject({
      configured: true,
      candidates: 0,
    });
    expect(fake.select).toHaveBeenCalledOnce();
    expect(fake.chain.leftJoin).toHaveBeenCalledOnce();
  });

  it("records the Review and enqueues the email in the same transaction, per shoot", async () => {
    const fake = fakeDatabase([row(), row({ shootId: shootB, clientId: clientB, clientEmail: "x" })]);
    mocks.requestReviewInTransaction.mockResolvedValue({ review: { id: reviewA }, created: true });
    mocks.enqueueAutomationEvent.mockResolvedValue({ created: true });

    await expect(
      scheduleReviewRequests({ now: earlyNow, database: fake.database, reviewUrl, reportError: vi.fn() }),
    ).resolves.toEqual({
      today: "2026-10-10",
      configured: true,
      candidates: 2,
      enqueued: 1,
      alreadyRequested: 0,
      notDue: 0,
      noEmail: 1,
      errors: 0,
    });
    expect(fake.transaction).toHaveBeenCalledOnce();
    expect(mocks.requestReviewInTransaction).toHaveBeenCalledWith(
      fake.tx,
      { clientId: clientA, shootId: shootA, source: "automacao", target: "google", targetUrl: reviewUrl },
      null,
    );
    expect(mocks.enqueueAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: reviewA, idempotencyKey: `review.requested:${shootA}:google` }),
      fake.tx,
    );
  });

  it("never enqueues when the Review already existed (concurrent run or portal click)", async () => {
    const fake = fakeDatabase([row()]);
    mocks.requestReviewInTransaction.mockResolvedValue({ review: { id: reviewA }, created: false });

    await expect(
      scheduleReviewRequests({ now: earlyNow, database: fake.database, reviewUrl }),
    ).resolves.toMatchObject({ enqueued: 0, alreadyRequested: 1 });
    expect(mocks.enqueueAutomationEvent).not.toHaveBeenCalled();
  });

  it("keeps going when one shoot fails and reports it without personal data", async () => {
    const fake = fakeDatabase([row(), row({ shootId: shootB, clientId: clientB, clientEmail: "bia@example.test" })]);
    mocks.requestReviewInTransaction
      .mockRejectedValueOnce(new Error("insert failed for ana@example.test"))
      .mockResolvedValueOnce({ review: { id: reviewB }, created: true });
    mocks.enqueueAutomationEvent.mockResolvedValue({ created: true });
    const reportError = vi.fn();

    await expect(
      scheduleReviewRequests({ now: earlyNow, database: fake.database, reviewUrl, reportError }),
    ).resolves.toMatchObject({ enqueued: 1, errors: 1 });
    expect(reportError).toHaveBeenCalledOnce();
    const [reported, context] = reportError.mock.calls[0];
    expect((reported as Error).message).not.toContain("ana@example.test");
    expect(context).toMatchObject({ tags: { area: "email-automation" }, extra: { shootId: shootA } });
  });
});
