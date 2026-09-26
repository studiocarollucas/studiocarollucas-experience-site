import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, reviews, shoots, type Review } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";
import {
  cancelReviewSchema,
  completeReviewSchema,
  requestReviewSchema,
  type CancelReviewInput,
  type CompleteReviewInput,
  type RequestReviewInput,
} from "./schema";

/** A rule violation the caller can show to staff as is. */
export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

// Tolerates small clock differences between the browser/Admin and the server.
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function auditView(review: Review) {
  return {
    clientId: review.clientId,
    shootId: review.shootId,
    status: review.status,
    source: review.source,
    target: review.target,
    targetUrl: review.targetUrl,
    requestedAt: review.requestedAt,
    completedAt: review.completedAt,
  };
}

/** The transaction of a caller that writes the Review with its own action (SCL-704/SCL-721). */
export type ReviewWriter = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Records that a review was requested (PRD §7.10). Idempotent per Shoot and
 * destination: while a requested or completed review exists for that pair
 * (unique index reviews_one_active_per_shoot_target_idx), the existing row is
 * returned with `created: false` and nothing is audited — so a repeated
 * post-delivery trigger (SCL-704) never asks the client twice.
 */
export async function requestReview(
  input: RequestReviewInput,
  actorUserId: string | null,
): Promise<{ review: Review; created: boolean }> {
  const parsed = requestReviewSchema.parse(input);
  return db.transaction((tx) => requestReviewInTransaction(tx, parsed, actorUserId));
}

/**
 * Same as requestReview, inside the caller's transaction: the post-delivery
 * automation enqueues its email and the portal records the link open in the
 * same commit as the Review.
 */
export async function requestReviewInTransaction(
  tx: ReviewWriter,
  input: RequestReviewInput,
  actorUserId: string | null,
): Promise<{ review: Review; created: boolean }> {
  const parsed = requestReviewSchema.parse(input);

  const [client] = await tx.select({ id: clients.id }).from(clients).where(eq(clients.id, parsed.clientId)).limit(1);
  if (!client) throw new ReviewError("Cliente inexistente.");

  if (parsed.shootId) {
    const [shoot] = await tx
      .select({ clientId: shoots.clientId })
      .from(shoots)
      .where(eq(shoots.id, parsed.shootId))
      .limit(1);
    if (!shoot || shoot.clientId !== parsed.clientId) {
      throw new ReviewError("O ensaio não pertence a esta cliente.");
    }
  }

  const [created] = await tx
    .insert(reviews)
    .values({
      clientId: parsed.clientId,
      shootId: parsed.shootId ?? null,
      status: "solicitado",
      source: parsed.source,
      target: parsed.target,
      targetUrl: parsed.targetUrl ?? null,
      requestedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    // Only the partial unique index can conflict, and it only covers rows
    // with a Shoot.
    if (!parsed.shootId) throw new Error("Pedido de avaliação em conflito.");
    const [existing] = await tx
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.shootId, parsed.shootId),
          eq(reviews.target, parsed.target),
          ne(reviews.status, "cancelado"),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("Pedido de avaliação em conflito.");
    return { review: existing, created: false };
  }

  await recordAuditEvent(
    {
      actorUserId,
      action: "review.requested",
      entityType: "review",
      entityId: created.id,
      before: null,
      after: auditView(created),
    },
    tx,
  );
  return { review: created, created: true };
}

/**
 * Marks a requested review as completed. Completing an already completed review
 * is a no-op; a cancelled review cannot be completed.
 */
export async function completeReview(
  input: CompleteReviewInput,
  actorUserId: string | null,
): Promise<{ review: Review; changed: boolean }> {
  const parsed = completeReviewSchema.parse(input);
  const completedAt = parsed.completedAt ? new Date(parsed.completedAt) : new Date();
  if (completedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
    throw new ReviewError("A conclusão não pode estar no futuro.");
  }

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(reviews)
      .where(eq(reviews.id, parsed.reviewId))
      .limit(1)
      .for("update");
    if (!current) throw new ReviewError("Avaliação inexistente.");
    if (current.status === "concluido") return { review: current, changed: false };
    if (current.status !== "solicitado") throw new ReviewError("Avaliação cancelada não pode ser concluída.");
    if (current.requestedAt && completedAt.getTime() < current.requestedAt.getTime()) {
      throw new ReviewError("A conclusão não pode ser anterior ao pedido.");
    }

    const [updated] = await tx
      .update(reviews)
      .set({
        status: "concluido",
        completedAt,
        targetUrl: parsed.targetUrl ?? current.targetUrl,
        updatedAt: new Date(),
      })
      .where(and(eq(reviews.id, current.id), eq(reviews.status, "solicitado")))
      .returning();
    if (!updated) throw new Error("Avaliação alterada durante a conclusão.");

    await recordAuditEvent(
      {
        actorUserId,
        action: "review.completed",
        entityType: "review",
        entityId: updated.id,
        before: auditView(current),
        after: auditView(updated),
      },
      tx,
    );
    return { review: updated, changed: true };
  });
}

/** Cancels a pending request. Cancelling twice is a no-op; a completed review stays completed. */
export async function cancelReview(
  input: CancelReviewInput,
  actorUserId: string | null,
): Promise<{ review: Review; changed: boolean }> {
  const parsed = cancelReviewSchema.parse(input);

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(reviews)
      .where(eq(reviews.id, parsed.reviewId))
      .limit(1)
      .for("update");
    if (!current) throw new ReviewError("Avaliação inexistente.");
    if (current.status === "cancelado") return { review: current, changed: false };
    if (current.status !== "solicitado") throw new ReviewError("Avaliação concluída não pode ser cancelada.");

    const [updated] = await tx
      .update(reviews)
      .set({ status: "cancelado", updatedAt: new Date() })
      .where(and(eq(reviews.id, current.id), eq(reviews.status, "solicitado")))
      .returning();
    if (!updated) throw new Error("Avaliação alterada durante o cancelamento.");

    await recordAuditEvent(
      {
        actorUserId,
        action: "review.cancelled",
        entityType: "review",
        entityId: updated.id,
        before: auditView(current),
        after: auditView(updated),
      },
      tx,
    );
    return { review: updated, changed: true };
  });
}

export async function listClientReviews(clientId: string): Promise<Review[]> {
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.clientId, clientId))
    .orderBy(desc(reviews.createdAt), desc(reviews.id));
}
