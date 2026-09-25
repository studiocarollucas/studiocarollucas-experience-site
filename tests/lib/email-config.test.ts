// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailConfigError, resolveEmailDelivery } from "@/lib/email/config";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveEmailDelivery", () => {
  it("never selects the real provider unless EMAIL_DELIVERY_ENABLED is exactly true", () => {
    for (const flag of [undefined, "", "false", "1", "TRUE", "yes"]) {
      const config = resolveEmailDelivery({
        EMAIL_DELIVERY_ENABLED: flag,
        RESEND_API_KEY: "re_live_key",
        EMAIL_FROM: "Stúdio <ola@studiocarollucas.com.br>",
      });
      expect(config.mode).toBe("log");
      expect(config.provider.name).toBe("log");
    }
  });

  it("uses a log provider that only records non-personal identifiers", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const config = resolveEmailDelivery({});

    await expect(
      config.provider.send(
        { from: config.from, to: "ana@example.test", subject: "Assunto pessoal", html: "<p>Ana</p>", text: "Ana" },
        { idempotencyKey: "notification-delivery/1" },
      ),
    ).resolves.toEqual({ provider: "log", messageId: null });

    const output = log.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("notification-delivery/1");
    expect(output).not.toContain("ana@example.test");
    expect(output).not.toContain("Assunto pessoal");
  });

  it("requires RESEND_API_KEY and EMAIL_FROM once enabled, without echoing values", () => {
    expect(() => resolveEmailDelivery({ EMAIL_DELIVERY_ENABLED: "true" })).toThrow(EmailConfigError);
    expect(() => resolveEmailDelivery({ EMAIL_DELIVERY_ENABLED: "true", RESEND_API_KEY: "re_x" })).toThrow(/EMAIL_FROM/);
    expect(() => resolveEmailDelivery({ EMAIL_DELIVERY_ENABLED: "true", EMAIL_FROM: "a@b.test" })).toThrow(/RESEND_API_KEY/);
  });

  it("selects Resend with sender and optional reply-to when fully configured", () => {
    const config = resolveEmailDelivery({
      EMAIL_DELIVERY_ENABLED: "true",
      RESEND_API_KEY: "re_live_key",
      EMAIL_FROM: " Stúdio Carol Lucas <ola@studiocarollucas.com.br> ",
      EMAIL_REPLY_TO: "experiencia@studiocarollucas.com.br",
    });
    expect(config).toMatchObject({
      mode: "resend",
      from: "Stúdio Carol Lucas <ola@studiocarollucas.com.br>",
      replyTo: "experiencia@studiocarollucas.com.br",
    });
    expect(config.provider.name).toBe("resend");
  });

  it("refuses to simulate delivery in the Vercel production environment", () => {
    expect(() => resolveEmailDelivery({ VERCEL_ENV: "production" })).toThrow(EmailConfigError);
    expect(resolveEmailDelivery({ VERCEL_ENV: "preview" }).mode).toBe("log");
  });
});
