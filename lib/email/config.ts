import { createLogEmailProvider } from "./log-provider";
import type { EmailProvider } from "./provider";
import { createResendProvider } from "./resend";

export type EmailDeliveryMode = "resend" | "log";

export type EmailDeliveryConfig = {
  mode: EmailDeliveryMode;
  provider: EmailProvider;
  from: string;
  replyTo?: string;
};

type EmailEnv = Readonly<Record<string, string | undefined>>;

const SIMULATED_FROM = "Stúdio Carol Lucas <nao-responda@example.invalid>";

export class EmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigError";
  }
}

/**
 * Resolved per request (never at import/build time). Real email requires the
 * explicit opt-in EMAIL_DELIVERY_ENABLED=true; anything else uses the log
 * provider — except in Vercel production, where a missing opt-in is a
 * configuration error so deliveries are never silently "sent" to the log.
 */
export function resolveEmailDelivery(env: EmailEnv = process.env): EmailDeliveryConfig {
  const replyTo = env.EMAIL_REPLY_TO?.trim() || undefined;

  if (env.EMAIL_DELIVERY_ENABLED !== "true") {
    if (env.VERCEL_ENV === "production") {
      throw new EmailConfigError('EMAIL_DELIVERY_ENABLED precisa ser "true" em produção; nenhuma entrega foi processada.');
    }
    return { mode: "log", provider: createLogEmailProvider(), from: env.EMAIL_FROM?.trim() || SIMULATED_FROM, replyTo };
  }

  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    const missing = [apiKey ? null : "RESEND_API_KEY", from ? null : "EMAIL_FROM"].filter(Boolean).join(", ");
    throw new EmailConfigError(`configuração de e-mail incompleta: ${missing}`);
  }

  return { mode: "resend", provider: createResendProvider({ apiKey }), from, replyTo };
}
