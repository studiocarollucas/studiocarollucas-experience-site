"use server";

import { PortalReadError } from "@/domain/portal/read";
import { getPortalRequestContext } from "@/domain/portal/server";
import { readClientReviewPrompt, recordReviewLinkOpened } from "@/domain/reviews/portal";
import { rememberReviewPromptDismissed } from "@/domain/reviews/portal-server";
import type { ActionResult } from "@/lib/auth/action-result";
import { logger } from "@/lib/observability/logger";

// Client-portal mutations (outside app/admin, so not defineAdminAction) for the
// SCL-721 review card. Neither takes a payload: the client, her Auth user and
// the shoot are always resolved from the session on the server, and the card
// rule is re-checked here.

const sessionExpiredMessage = "Sua sessão expirou. Entre novamente.";

function failure(error: unknown, operation: string): ActionResult<never> {
  if (error instanceof PortalReadError && error.code !== "query_failed") {
    return { ok: false, error: sessionExpiredMessage };
  }
  logger.error(operation, { message: error instanceof Error ? error.message : String(error) });
  return { ok: false, error: "Não foi possível registrar agora. Tente novamente." };
}

/** "Avaliar no Google" was clicked: record "cliente abriu o link" and stop showing the card. */
export async function openReviewLinkAction(): Promise<ActionResult<{ recorded: boolean }>> {
  try {
    const context = await getPortalRequestContext();
    const result = await recordReviewLinkOpened({
      clientId: context.client.id,
      authUserId: context.viewerAuthUserId,
    });
    if (result.shootId) await rememberReviewPromptDismissed(result.shootId);
    return { ok: true, data: { recorded: result.recorded } };
  } catch (error) {
    return failure(error, "review link open failed");
  }
}

/** "Agora não": hides the card for this shoot in this browser. Nothing else is recorded. */
export async function dismissReviewPromptAction(): Promise<ActionResult<{ dismissed: boolean }>> {
  try {
    const context = await getPortalRequestContext();
    const prompt = await readClientReviewPrompt(context.client.id);
    if (!prompt) return { ok: true, data: { dismissed: false } };
    await rememberReviewPromptDismissed(prompt.shootId);
    return { ok: true, data: { dismissed: true } };
  } catch (error) {
    return failure(error, "review prompt dismiss failed");
  }
}
