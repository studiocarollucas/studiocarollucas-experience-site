import { EmailProviderError, type EmailProvider } from "@/lib/email/provider";
import { logger } from "@/lib/observability/logger";
import { reportError as reportToSentry, type ErrorReporter } from "@/lib/observability/report-error";
import { DEFAULT_RETRY_POLICY, planDeliveryFailure, type RetryPolicy } from "./retry";
import { sanitizeDeliveryError } from "./sanitize";
import { EmailTemplateDataError } from "./templates/define";
import { getEmailTemplate, UnknownEmailTemplateError } from "./templates/registry";

export const DEFAULT_BATCH_SIZE = 20;
export const DEFAULT_LEASE_MS = 5 * 60_000;

export type ClaimedDelivery = {
  id: string;
  eventId: string;
  templateKey: string;
  templateVersion: number;
  recipient: string;
  templateData: Record<string, unknown>;
  /** Already incremented by the claim: the number of the attempt in progress. */
  attemptCount: number;
  maxAttempts: number;
};

/**
 * Persistence used by the processor. Every mark* call is conditional on the row
 * still being `sending` with the claimed attempt, and resolves false otherwise
 * (the lease expired and another run reclaimed it).
 */
export interface DeliveryStore {
  failExhaustedLeases(now: Date): Promise<number>;
  claimDue(input: { now: Date; limit: number; leaseMs: number }): Promise<ClaimedDelivery[]>;
  markSent(input: {
    id: string;
    attemptCount: number;
    provider: string;
    providerMessageId: string | null;
    now: Date;
  }): Promise<boolean>;
  markRetry(input: { id: string; attemptCount: number; nextAttemptAt: Date; error: string; now: Date }): Promise<boolean>;
  markFailed(input: { id: string; attemptCount: number; error: string; now: Date }): Promise<boolean>;
  /** The guard vetoed the send: `cancelled`, never retried. `reason` holds no personal data. */
  markCancelled(input: { id: string; attemptCount: number; reason: string; now: Date }): Promise<boolean>;
}

export type DeliveryGuardDecision = { send: true } | { send: false; reason: string };

/**
 * Send-time eligibility check (e.g. a reminder for a shoot that was cancelled
 * or moved after it was enqueued). A thrown error counts as a transient
 * failure and the delivery is retried.
 */
export type DeliveryGuard = (delivery: ClaimedDelivery, now: Date) => Promise<DeliveryGuardDecision>;

export type ProcessDeliveriesSummary = {
  staleFailed: number;
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  cancelled: number;
  lostLease: number;
  errors: number;
};

type ProcessDueDeliveriesOptions = {
  store: DeliveryStore;
  provider: EmailProvider;
  from: string;
  replyTo?: string;
  now?: () => Date;
  limit?: number;
  leaseMs?: number;
  retryPolicy?: RetryPolicy;
  reportError?: ErrorReporter;
  guard?: DeliveryGuard;
};

type AttemptOutcome =
  | { kind: "sent"; provider: string; messageId: string | null }
  | { kind: "cancelled"; reason: string }
  | { kind: "error"; error: unknown };

class EmailDeliveryFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryFailure";
  }
}

/** Stable per delivery: a retry after a lost provider response cannot send twice. */
export function deliveryIdempotencyKey(deliveryId: string): string {
  return `notification-delivery/${deliveryId}`;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof EmailProviderError) return error.retryable;
  if (error instanceof UnknownEmailTemplateError || error instanceof EmailTemplateDataError) return false;
  return true;
}

/**
 * Claims due deliveries and sends them one by one (the provider rate-limits
 * per second). Logs and Sentry reports carry identifiers only — never the
 * recipient, subject or template data.
 */
export async function processDueDeliveries(options: ProcessDueDeliveriesOptions): Promise<ProcessDeliveriesSummary> {
  const now = options.now ?? (() => new Date());
  const reportError = options.reportError ?? reportToSentry;
  const retryPolicy = options.retryPolicy ?? DEFAULT_RETRY_POLICY;
  const { store, provider } = options;
  const summary: ProcessDeliveriesSummary = {
    staleFailed: 0,
    claimed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
    cancelled: 0,
    lostLease: 0,
    errors: 0,
  };

  summary.staleFailed = await store.failExhaustedLeases(now());
  if (summary.staleFailed > 0) {
    logger.error("email deliveries failed after an expired final lease", { count: summary.staleFailed });
    reportError(new EmailDeliveryFailure("entregas de e-mail sem confirmação após a última tentativa"), {
      tags: { area: "email-automation", reason: "lease-expired" },
      extra: { count: summary.staleFailed },
    });
  }

  const deliveries = await store.claimDue({
    now: now(),
    limit: options.limit ?? DEFAULT_BATCH_SIZE,
    leaseMs: options.leaseMs ?? DEFAULT_LEASE_MS,
  });
  summary.claimed = deliveries.length;

  async function attemptDelivery(delivery: ClaimedDelivery): Promise<AttemptOutcome> {
    try {
      if (options.guard) {
        const decision = await options.guard(delivery, now());
        if (!decision.send) return { kind: "cancelled", reason: decision.reason };
      }
      const rendered = getEmailTemplate(delivery.templateKey, delivery.templateVersion).render(delivery.templateData);
      const result = await provider.send(
        {
          from: options.from,
          to: delivery.recipient,
          replyTo: options.replyTo,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tags: [
            { name: "template", value: delivery.templateKey },
            { name: "template_version", value: String(delivery.templateVersion) },
          ],
        },
        { idempotencyKey: deliveryIdempotencyKey(delivery.id) },
      );
      return { kind: "sent", provider: result.provider, messageId: result.messageId };
    } catch (error) {
      return { kind: "error", error };
    }
  }

  for (const delivery of deliveries) {
    const context = {
      deliveryId: delivery.id,
      eventId: delivery.eventId,
      templateKey: delivery.templateKey,
      templateVersion: delivery.templateVersion,
      attempt: delivery.attemptCount,
      maxAttempts: delivery.maxAttempts,
      provider: provider.name,
    };

    try {
      const outcome = await attemptDelivery(delivery);

      if (outcome.kind === "cancelled") {
        const marked = await store.markCancelled({
          id: delivery.id,
          attemptCount: delivery.attemptCount,
          reason: outcome.reason,
          now: now(),
        });
        if (marked) {
          summary.cancelled += 1;
          logger.info("email delivery cancelled at send time", { ...context, reason: outcome.reason });
        } else {
          summary.lostLease += 1;
          logger.warn("email delivery lease lost before it was marked cancelled", context);
        }
        continue;
      }

      if (outcome.kind === "sent") {
        const marked = await store.markSent({
          id: delivery.id,
          attemptCount: delivery.attemptCount,
          provider: outcome.provider,
          providerMessageId: outcome.messageId,
          now: now(),
        });
        if (marked) {
          summary.sent += 1;
          logger.info("email delivery sent", context);
        } else {
          summary.lostLease += 1;
          logger.warn("email delivery lease lost before it was marked sent", context);
        }
        continue;
      }

      const retryable = isRetryable(outcome.error);
      const error = sanitizeDeliveryError(outcome.error);
      const status = outcome.error instanceof EmailProviderError ? outcome.error.status : null;
      const plan = planDeliveryFailure({
        attemptCount: delivery.attemptCount,
        maxAttempts: delivery.maxAttempts,
        retryable,
        now: now(),
        policy: retryPolicy,
      });

      if (plan.kind === "retry") {
        const marked = await store.markRetry({
          id: delivery.id,
          attemptCount: delivery.attemptCount,
          nextAttemptAt: plan.nextAttemptAt,
          error,
          now: now(),
        });
        if (marked) summary.retried += 1;
        else summary.lostLease += 1;
        logger.warn("email delivery attempt failed; retry scheduled", {
          ...context,
          status,
          error,
          nextAttemptAt: plan.nextAttemptAt.toISOString(),
        });
        continue;
      }

      const marked = await store.markFailed({ id: delivery.id, attemptCount: delivery.attemptCount, error, now: now() });
      if (marked) summary.failed += 1;
      else summary.lostLease += 1;
      logger.error("email delivery failed permanently", { ...context, status, retryable, error });
      reportError(new EmailDeliveryFailure(`entrega de e-mail falhou definitivamente: ${error}`), {
        tags: { area: "email-automation", templateKey: delivery.templateKey, provider: provider.name },
        extra: { deliveryId: delivery.id, eventId: delivery.eventId, attempt: delivery.attemptCount, status, retryable },
      });
    } catch (bookkeepingError) {
      // The row stays `sending` until its lease expires, then is reclaimed; the
      // stable idempotency key keeps the provider from sending it twice.
      summary.errors += 1;
      const error = sanitizeDeliveryError(bookkeepingError);
      logger.error("email delivery bookkeeping failed", { ...context, error });
      reportError(new EmailDeliveryFailure(`falha ao registrar a entrega de e-mail: ${error}`), {
        tags: { area: "email-automation", reason: "bookkeeping" },
        extra: { deliveryId: delivery.id, attempt: delivery.attemptCount },
      });
    }
  }

  return summary;
}
