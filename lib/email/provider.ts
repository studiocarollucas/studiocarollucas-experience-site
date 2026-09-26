export type EmailTag = { name: string; value: string };

export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Non-personal labels only (e.g. template key/version). */
  tags?: EmailTag[];
};

export type EmailSendOptions = {
  /** Stable per delivery so a retry after a lost response cannot send twice. */
  idempotencyKey: string;
};

export type EmailSendResult = {
  provider: string;
  messageId: string | null;
};

/** The only surface the automation domain knows; Resend stays behind it. */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage, options: EmailSendOptions): Promise<EmailSendResult>;
}

export class EmailProviderError extends Error {
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(message: string, options: { retryable: boolean; status: number | null }) {
    super(message);
    this.name = "EmailProviderError";
    this.retryable = options.retryable;
    this.status = options.status;
  }
}
