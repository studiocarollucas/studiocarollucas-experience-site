import "server-only";

import { and, eq, gte, isNotNull, isNull, lte, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, galleries, productionJobs, reviews, shoots } from "@/db/schema";
import { readGoogleReviewUrl } from "@/domain/reviews/config";
import { requestReviewInTransaction } from "@/domain/reviews/service";
import { logger } from "@/lib/observability/logger";
import { reportError as reportToSentry, type ErrorReporter } from "@/lib/observability/report-error";
import { enqueueAutomationEvent, type EnqueueAutomationEventInput } from "../events";
import { firstNameOf, normalizeRecipient } from "../recipients";
import { sanitizeDeliveryError } from "../sanitize";
import { addCivilDays, studioDate, studioWallTimeToInstant } from "../studio-time";
import {
  isReviewRequestDue,
  REVIEW_REQUEST_DELAY_DAYS,
  REVIEW_REQUEST_EVENT_TYPE,
  REVIEW_REQUEST_MAX_DAYS,
  REVIEW_REQUEST_SEND_TIME,
  REVIEW_REQUEST_TARGET,
  REVIEW_REQUEST_TEMPLATE_KEY,
  reviewRequestIdempotencyKey,
} from "./rules";

export type ReviewRequestRow = {
  shootId: string;
  clientId: string;
  shootStatus: string;
  productionStatus: string | null;
  deliveryAt: string | null;
  galleryStatus: string | null;
  clientName: string;
  clientEmail: string | null;
};

export type PlannedReviewRequest = {
  shootId: string;
  clientId: string;
  recipient: string;
  firstName?: string;
};

export type ReviewRequestPlan = {
  requests: PlannedReviewRequest[];
  notDue: number;
  noEmail: number;
};

/** Pure: which delivered shoots get the review request today (studio calendar). */
export function planReviewRequests(rows: ReviewRequestRow[], { now }: { now: Date }): ReviewRequestPlan {
  const today = studioDate(now);
  const plan: ReviewRequestPlan = { requests: [], notDue: 0, noEmail: 0 };
  const seen = new Set<string>();

  for (const row of rows) {
    // The join can repeat a shoot; one request per shoot.
    if (seen.has(row.shootId)) continue;
    seen.add(row.shootId);

    if (!isReviewRequestDue(row, today)) {
      plan.notDue += 1;
      continue;
    }
    const recipient = normalizeRecipient(row.clientEmail);
    if (!recipient) {
      plan.noEmail += 1;
      continue;
    }
    const firstName = firstNameOf(row.clientName);
    plan.requests.push({
      shootId: row.shootId,
      clientId: row.clientId,
      recipient,
      ...(firstName ? { firstName } : {}),
    });
  }

  return plan;
}

/**
 * The outbox event of one request. The payload carries IDs only; the template
 * gets the first name and the review link, pinned at enqueue.
 */
export function reviewRequestEventInput(input: {
  request: PlannedReviewRequest;
  reviewId: string;
  reviewUrl: string;
  now: Date;
}): EnqueueAutomationEventInput {
  const { request, reviewId, reviewUrl, now } = input;
  const localSendAt = studioWallTimeToInstant(studioDate(now), REVIEW_REQUEST_SEND_TIME);
  const sendAt = localSendAt > now ? localSendAt : undefined;
  return {
    eventType: REVIEW_REQUEST_EVENT_TYPE,
    entityType: "review",
    entityId: reviewId,
    idempotencyKey: reviewRequestIdempotencyKey(request.shootId),
    payload: { reviewId, shootId: request.shootId, target: REVIEW_REQUEST_TARGET },
    occurredAt: now,
    deliveries: [
      {
        templateKey: REVIEW_REQUEST_TEMPLATE_KEY,
        recipient: request.recipient,
        data: { ...(request.firstName ? { firstName: request.firstName } : {}), reviewUrl },
        ...(sendAt ? { sendAt } : {}),
      },
    ],
  };
}

export type ReviewRequestScheduleSummary = {
  today: string;
  /** false when STUDIO_GOOGLE_REVIEW_URL is missing/invalid: nothing was read or written. */
  configured: boolean;
  candidates: number;
  enqueued: number;
  alreadyRequested: number;
  notDue: number;
  noEmail: number;
  errors: number;
};

type ScheduleReviewRequestsOptions = {
  now?: Date;
  database?: Pick<typeof db, "select" | "transaction">;
  reportError?: ErrorReporter;
  /** Defaults to STUDIO_GOOGLE_REVIEW_URL, read at call time. */
  reviewUrl?: string | null;
};

/**
 * SCL-704 scheduler step (run by /api/cron/review-requests). Selects shoots
 * delivered inside the email window, with a published Reveal and no Google
 * Review yet, and — per shoot, in one transaction — records the Review
 * (`automacao`) and enqueues the `pedido-avaliacao` email. Safe to run many
 * times: a shoot with any Google Review is never selected again, the Review's
 * unique index and the outbox key stop concurrent runs, and the send-time guard
 * drops the email if the Review is completed/cancelled meanwhile.
 */
export async function scheduleReviewRequests(
  options: ScheduleReviewRequestsOptions = {},
): Promise<ReviewRequestScheduleSummary> {
  const now = options.now ?? new Date();
  const database = options.database ?? db;
  const reportError = options.reportError ?? reportToSentry;
  const reviewUrl = options.reviewUrl === undefined ? readGoogleReviewUrl() : options.reviewUrl;
  const today = studioDate(now);
  const summary: ReviewRequestScheduleSummary = {
    today,
    configured: Boolean(reviewUrl),
    candidates: 0,
    enqueued: 0,
    alreadyRequested: 0,
    notDue: 0,
    noEmail: 0,
    errors: 0,
  };

  if (!reviewUrl) {
    // One line per run (not per shoot), and nothing is written.
    logger.warn("review requests skipped: STUDIO_GOOGLE_REVIEW_URL missing or invalid");
    return summary;
  }

  const rows: ReviewRequestRow[] = await database
    .select({
      shootId: shoots.id,
      clientId: shoots.clientId,
      shootStatus: shoots.status,
      productionStatus: productionJobs.status,
      deliveryAt: productionJobs.deliveryAt,
      galleryStatus: galleries.status,
      clientName: clients.name,
      clientEmail: clients.email,
    })
    .from(productionJobs)
    .innerJoin(shoots, eq(shoots.id, productionJobs.shootId))
    .innerJoin(clients, eq(clients.id, shoots.clientId))
    .innerJoin(galleries, eq(galleries.shootId, shoots.id))
    .leftJoin(reviews, and(eq(reviews.shootId, shoots.id), eq(reviews.target, REVIEW_REQUEST_TARGET)))
    .where(
      and(
        eq(productionJobs.status, "entregue"),
        gte(productionJobs.deliveryAt, addCivilDays(today, -REVIEW_REQUEST_MAX_DAYS)),
        lte(productionJobs.deliveryAt, addCivilDays(today, -REVIEW_REQUEST_DELAY_DAYS)),
        eq(galleries.status, "published"),
        ne(shoots.status, "cancelado"),
        isNotNull(clients.email),
        // Any Google Review (requested, completed or cancelled by staff) means "do not ask".
        isNull(reviews.id),
      ),
    );

  const plan = planReviewRequests(rows, { now });
  summary.candidates = rows.length;
  summary.notDue = plan.notDue;
  summary.noEmail = plan.noEmail;

  for (const request of plan.requests) {
    try {
      const outcome = await database.transaction(async (tx) => {
        const { review, created } = await requestReviewInTransaction(
          tx,
          {
            clientId: request.clientId,
            shootId: request.shootId,
            source: "automacao",
            target: REVIEW_REQUEST_TARGET,
            targetUrl: reviewUrl,
          },
          null,
        );
        // Another run (or the portal) got there first: never ask twice.
        if (!created) return "exists" as const;
        const result = await enqueueAutomationEvent(
          reviewRequestEventInput({ request, reviewId: review.id, reviewUrl, now }),
          tx,
        );
        return result.created ? ("enqueued" as const) : ("exists" as const);
      });
      if (outcome === "enqueued") summary.enqueued += 1;
      else summary.alreadyRequested += 1;
    } catch (error) {
      summary.errors += 1;
      const message = sanitizeDeliveryError(error);
      logger.error("review request enqueue failed", { shootId: request.shootId, error: message });
      reportError(new Error(`falha ao pedir avaliação: ${message}`), {
        tags: { area: "email-automation", reason: "review-request-schedule" },
        extra: { shootId: request.shootId },
      });
    }
  }

  return summary;
}
