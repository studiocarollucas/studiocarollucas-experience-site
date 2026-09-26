import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog, reviews, type ReviewSource, type ReviewStatus } from "@/db/schema";
import { REVIEW_REQUEST_TARGET } from "@/domain/automation/flows/rules";

/** Serializable view of the shoot's Google review for the Admin (SCL-721). */
export type ShootReviewPanel = {
  review: {
    id: string;
    status: ReviewStatus;
    source: ReviewSource;
    requestedAt: string | null;
    completedAt: string | null;
  } | null;
  /** Last "cliente abriu o link" (audit `review.link_opened`), ISO. */
  linkOpenedAt: string | null;
};

type ReviewPanelReader = Pick<typeof db, "select">;

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export async function getShootReviewPanel(
  shootId: string,
  database: ReviewPanelReader = db,
): Promise<ShootReviewPanel> {
  const [review] = await database
    .select()
    .from(reviews)
    .where(and(eq(reviews.shootId, shootId), eq(reviews.target, REVIEW_REQUEST_TARGET)))
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(1);
  if (!review) return { review: null, linkOpenedAt: null };

  const [opened] = await database
    .select({ createdAt: auditLog.createdAt })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.entityType, "review"),
        eq(auditLog.entityId, review.id),
        eq(auditLog.action, "review.link_opened"),
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(1);

  return {
    review: {
      id: review.id,
      status: review.status,
      source: review.source,
      requestedAt: toIso(review.requestedAt),
      completedAt: toIso(review.completedAt),
    },
    linkOpenedAt: toIso(opened?.createdAt ?? null),
  };
}
