import "server-only";

import { createDrizzleDeliveryStore } from "@/domain/automation/delivery-store";
import { createAutomationDeliveryGuard } from "@/domain/automation/guard";
import { processDueDeliveries } from "@/domain/automation/processor";
import { sanitizeDeliveryError } from "@/domain/automation/sanitize";
import { isAuthorizedCronRequest, isCronSecretConfigured } from "@/lib/auth/cron-secret";
import { EmailConfigError, resolveEmailDelivery, type EmailDeliveryConfig } from "@/lib/email/config";
import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/report-error";

// Machine-to-machine endpoint for the email outbox (SCL-700/SCL-705). It lives
// outside app/admin on purpose: no user session exists; the caller proves
// itself with CRON_SECRET. See docs/runbooks/email-automation.md.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!isCronSecretConfigured(secret)) {
    logger.error("email cron invoked without a valid CRON_SECRET configured");
    return json({ ok: false, error: "Processamento indisponível." }, 503);
  }
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), secret)) {
    return json({ ok: false, error: "Não autorizado." }, 401);
  }

  let delivery: EmailDeliveryConfig;
  try {
    delivery = resolveEmailDelivery();
  } catch (error) {
    const message = error instanceof EmailConfigError ? error.message : sanitizeDeliveryError(error);
    logger.error("email cron configuration error", { error: message });
    reportError(error instanceof EmailConfigError ? error : new Error(message), {
      tags: { area: "email-automation", reason: "config" },
    });
    return json({ ok: false, error: "Envio de e-mail não configurado." }, 503);
  }

  try {
    const summary = await processDueDeliveries({
      store: createDrizzleDeliveryStore(),
      provider: delivery.provider,
      from: delivery.from,
      replyTo: delivery.replyTo,
      guard: createAutomationDeliveryGuard(),
    });
    logger.info("email cron finished", { mode: delivery.mode, ...summary });
    return json({ ok: true, mode: delivery.mode, ...summary }, 200);
  } catch (error) {
    const message = sanitizeDeliveryError(error);
    logger.error("email cron failed", { error: message });
    reportError(new Error(`email cron failed: ${message}`), { tags: { area: "email-automation", reason: "cron" } });
    return json({ ok: false, error: "Falha ao processar entregas." }, 500);
  }
}

/** Vercel Cron calls GET with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

/** Same contract for external schedulers or a manual `curl -X POST`. */
export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
