import { EmailProviderError, type EmailProvider } from "./provider";

export const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

const DEFAULT_TIMEOUT_MS = 10_000;

type ResendProviderOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function isRetryableStatus(status: number): boolean {
  // 409 covers Resend's "concurrent idempotent request" while a twin is in flight.
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Resend over its REST API (no SDK dependency). */
export function createResendProvider({
  apiKey,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: ResendProviderOptions): EmailProvider {
  return {
    name: "resend",
    async send(message, { idempotencyKey }) {
      const body = {
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        ...(message.tags && message.tags.length > 0 ? { tags: message.tags } : {}),
      };

      let response: Response;
      try {
        response = await fetchImpl(RESEND_EMAILS_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const reason = error instanceof Error ? error.name : "erro";
        throw new EmailProviderError(`falha de rede ao chamar o Resend (${reason})`, { retryable: true, status: null });
      }

      const payload = await readJson(response);
      if (response.ok) {
        return { provider: "resend", messageId: typeof payload?.id === "string" ? payload.id : null };
      }

      const name = typeof payload?.name === "string" ? payload.name : "erro";
      const detail = typeof payload?.message === "string" ? payload.message : response.statusText;
      // The processor sanitizes this before persisting or logging it.
      throw new EmailProviderError(`Resend ${response.status} ${name}: ${detail}`.trim(), {
        retryable: isRetryableStatus(response.status),
        status: response.status,
      });
    },
  };
}
