import "server-only";

import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { getPortalRequestContext } from "@/domain/portal/server";
import { logger } from "@/lib/observability/logger";
import { readClientReviewPrompt, type ClientReviewPrompt } from "./portal";

/**
 * Per-browser dismissal of the review card (SCL-721), holding the id of the
 * shoot it was dismissed for: a later shoot gets its own card. No schema change
 * and no tracking — it only remembers "agora não".
 */
export const REVIEW_PROMPT_DISMISSED_COOKIE = "scl_review_prompt_dismissed";
const REVIEW_PROMPT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

/**
 * The review card for the signed-in client, or null. Never throws for data
 * problems: the card is optional, so a failed read hides it and the portal page
 * renders as usual.
 */
export async function getPortalReviewPrompt(): Promise<ClientReviewPrompt | null> {
  try {
    const context = await getPortalRequestContext();
    const prompt = await readClientReviewPrompt(context.client.id);
    if (!prompt) return null;
    const dismissedFor = (await cookies()).get(REVIEW_PROMPT_DISMISSED_COOKIE)?.value;
    return dismissedFor === prompt.shootId ? null : prompt;
  } catch (error) {
    unstable_rethrow(error);
    logger.error("review prompt unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Only callable from a Server Action (cookies can only be set there). */
export async function rememberReviewPromptDismissed(shootId: string): Promise<void> {
  (await cookies()).set(REVIEW_PROMPT_DISMISSED_COOKIE, shootId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/minha-experiencia",
    maxAge: REVIEW_PROMPT_COOKIE_MAX_AGE_SECONDS,
  });
}
