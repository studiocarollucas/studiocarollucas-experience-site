import * as Sentry from "@sentry/nextjs";

export type ErrorReportContext = {
  tags: Record<string, string>;
  extra?: Record<string, unknown>;
};

export type ErrorReporter = (error: unknown, context: ErrorReportContext) => void;

/**
 * Server-side Sentry capture for handled errors. Inert without SENTRY_DSN
 * (see sentry.server.config.ts). Callers must pass sanitized errors/context.
 */
export const reportError: ErrorReporter = (error, { tags, extra }) => {
  Sentry.captureException(error, { tags, extra });
};
