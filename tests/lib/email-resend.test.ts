// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { EmailProviderError, type EmailMessage } from "@/lib/email/provider";
import { createResendProvider, RESEND_EMAILS_ENDPOINT } from "@/lib/email/resend";

const message: EmailMessage = {
  from: "Stúdio Carol Lucas <ola@studiocarollucas.com.br>",
  to: "ana@example.test",
  subject: "Boas-vindas ao Stúdio Carol Lucas",
  html: "<p>Olá</p>",
  text: "Olá",
  replyTo: "experiencia@studiocarollucas.com.br",
  tags: [{ name: "template", value: "boas-vindas" }],
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function providerWith(fetchImpl: ReturnType<typeof vi.fn>) {
  return createResendProvider({ apiKey: "re_test_key", fetchImpl: fetchImpl as unknown as typeof fetch });
}

describe("Resend provider", () => {
  it("posts the message to the REST API with bearer auth and the idempotency key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { id: "msg_123" }));

    await expect(providerWith(fetchImpl).send(message, { idempotencyKey: "notification-delivery/abc" })).resolves.toEqual({
      provider: "resend",
      messageId: "msg_123",
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(RESEND_EMAILS_ENDPOINT);
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
      "Content-Type": "application/json",
      "Idempotency-Key": "notification-delivery/abc",
    });
    expect(init.signal).toBeDefined();
    expect(JSON.parse(String(init.body))).toEqual({
      from: message.from,
      to: ["ana@example.test"],
      subject: message.subject,
      html: message.html,
      text: message.text,
      reply_to: "experiencia@studiocarollucas.com.br",
      tags: [{ name: "template", value: "boas-vindas" }],
    });
  });

  it("omits optional fields that were not provided", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { id: "msg_1" }));
    await providerWith(fetchImpl).send({ ...message, replyTo: undefined, tags: undefined }, { idempotencyKey: "k" });
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body).not.toHaveProperty("reply_to");
    expect(body).not.toHaveProperty("tags");
  });

  it.each([408, 409, 429, 500, 503])("marks HTTP %i as retryable", async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(status, { name: "rate_limit_exceeded", message: "Too many requests" }));
    const error = await providerWith(fetchImpl).send(message, { idempotencyKey: "k" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EmailProviderError);
    expect(error).toMatchObject({ retryable: true, status });
  });

  it.each([400, 401, 403, 422])("marks HTTP %i as permanent and keeps the provider reason", async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(status, { name: "validation_error", message: "Invalid `to` field." }));
    const error = await providerWith(fetchImpl).send(message, { idempotencyKey: "k" }).catch((e: unknown) => e);
    expect(error).toMatchObject({ retryable: false, status });
    expect((error as Error).message).toContain(`Resend ${status}`);
    expect((error as Error).message).toContain("validation_error");
  });

  it("treats network failures and non-JSON error bodies as retryable", async () => {
    const offline = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(providerWith(offline).send(message, { idempotencyKey: "k" })).rejects.toMatchObject({
      retryable: true,
      status: null,
    });

    const html = vi.fn().mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 }));
    await expect(providerWith(html).send(message, { idempotencyKey: "k" })).rejects.toMatchObject({
      retryable: true,
      status: 502,
    });
  });

  it("accepts a success without a parseable id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    await expect(providerWith(fetchImpl).send(message, { idempotencyKey: "k" })).resolves.toEqual({
      provider: "resend",
      messageId: null,
    });
  });
});
