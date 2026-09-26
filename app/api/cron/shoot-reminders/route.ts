import "server-only";

import { scheduleShootReminders } from "@/domain/automation/flows/shoot-reminders";
import { sanitizeDeliveryError } from "@/domain/automation/sanitize";
import { isAuthorizedCronRequest, isCronSecretConfigured } from "@/lib/auth/cron-secret";
import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/report-error";

// SCL-702 scheduler step: enqueues today's D-7/D-1 reminders (studio timezone)
// into the email outbox; /api/cron/email-deliveries sends them. Same
// machine-to-machine contract as that route (CRON_SECRET, outside app/admin).
// It only writes events, so it does not depend on the email provider config.
// See docs/runbooks/email-automation.md.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!isCronSecretConfigured(secret)) {
    logger.error("shoot reminders cron invoked without a valid CRON_SECRET configured");
    return json({ ok: false, error: "Agendamento indisponível." }, 503);
  }
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), secret)) {
    return json({ ok: false, error: "Não autorizado." }, 401);
  }

  try {
    const summary = await scheduleShootReminders();
    logger.info("shoot reminders cron finished", summary);
    return json({ ok: true, ...summary }, 200);
  } catch (error) {
    const message = sanitizeDeliveryError(error);
    logger.error("shoot reminders cron failed", { error: message });
    reportError(new Error(`shoot reminders cron failed: ${message}`), {
      tags: { area: "email-automation", reason: "reminder-cron" },
    });
    return json({ ok: false, error: "Falha ao agendar lembretes." }, 500);
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
