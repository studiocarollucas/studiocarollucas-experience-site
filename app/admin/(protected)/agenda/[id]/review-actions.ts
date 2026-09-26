"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionableAdminActionError, defineAdminAction } from "@/lib/auth/admin-action";
import { cancelReview, completeReview, ReviewError } from "@/domain/reviews/service";

// SCL-721: staff close the Google review loop from the shoot page. The actor is
// always the session user; completeReview/cancelReview audit in their own
// transaction and enforce the transitions (solicitado → concluido | cancelado).

const shootReviewInputSchema = z.object({
  shootId: z.string().uuid(),
  reviewId: z.string().uuid(),
});

function actionable(err: unknown): never {
  if (err instanceof ReviewError) throw new ActionableAdminActionError(err.message);
  throw err;
}

export const completeShootReviewAction = defineAdminAction(
  { role: "staff", input: shootReviewInputSchema },
  async (input, ctx) => {
    try {
      await completeReview({ reviewId: input.reviewId }, ctx.user.id);
    } catch (err) {
      actionable(err);
    }
    revalidatePath(`/admin/agenda/${input.shootId}`);
    return { reviewId: input.reviewId };
  },
);

export const cancelShootReviewAction = defineAdminAction(
  { role: "staff", input: shootReviewInputSchema },
  async (input, ctx) => {
    try {
      await cancelReview({ reviewId: input.reviewId }, ctx.user.id);
    } catch (err) {
      actionable(err);
    }
    revalidatePath(`/admin/agenda/${input.shootId}`);
    return { reviewId: input.reviewId };
  },
);
