// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineEmailTemplate, EmailTemplateDataError } from "@/domain/automation/templates/define";
import { escapeHtml } from "@/domain/automation/templates/html";
import {
  emailTemplates,
  getEmailTemplate,
  getLatestEmailTemplate,
  renderEmailTemplate,
  UnknownEmailTemplateError,
} from "@/domain/automation/templates/registry";

describe("email template registry", () => {
  it("registers each key/version once with positive integer versions", () => {
    const ids = emailTemplates.map((template) => `${template.key}@${template.version}`);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of emailTemplates) {
      expect(Number.isInteger(template.version)).toBe(true);
      expect(template.version).toBeGreaterThan(0);
      expect(template.key).toMatch(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
    }
  });

  it("resolves the latest version for enqueueing and a pinned version for rendering", () => {
    expect(getLatestEmailTemplate("boas-vindas")).toMatchObject({ key: "boas-vindas", version: 1 });
    expect(getEmailTemplate("boas-vindas", 1)).toMatchObject({ key: "boas-vindas", version: 1 });
  });

  it("refuses unknown keys and versions instead of guessing", () => {
    expect(() => getLatestEmailTemplate("nao-existe")).toThrow(UnknownEmailTemplateError);
    expect(() => getEmailTemplate("boas-vindas", 99)).toThrow(UnknownEmailTemplateError);
    expect(() => renderEmailTemplate("boas-vindas", 99, { firstName: "Ana" })).toThrow(UnknownEmailTemplateError);
  });
});

describe("boas-vindas v1", () => {
  it("renders pt-BR subject, HTML and plain text", () => {
    const email = renderEmailTemplate("boas-vindas", 1, {
      firstName: "Ana",
      portalUrl: "https://studiocarollucas.com.br/minha-experiencia",
    });

    expect(email.subject).toBe("Boas-vindas ao Stúdio Carol Lucas");
    expect(email.text).toContain("Olá, Ana!");
    expect(email.text).toContain("https://studiocarollucas.com.br/minha-experiencia");
    expect(email.html).toContain("Olá, Ana!");
    expect(email.html).toContain('href="https://studiocarollucas.com.br/minha-experiencia"');
    expect(email.html).toContain('<html lang="pt-BR">');
  });

  it("omits the portal call-to-action when no link is given", () => {
    const email = renderEmailTemplate("boas-vindas", 1, { firstName: "Ana" });
    expect(email.html).not.toContain("href=");
    expect(email.text).not.toContain("Minha Experiência:");
  });

  it("escapes every interpolated value in HTML", () => {
    const email = renderEmailTemplate("boas-vindas", 1, { firstName: '<script>alert("x")</script>' });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("rejects invalid data without echoing the submitted values", () => {
    const attempt = () => renderEmailTemplate("boas-vindas", 1, { firstName: "", portalUrl: "javascript:alert(1)" });
    expect(attempt).toThrow(EmailTemplateDataError);
    try {
      attempt();
    } catch (error) {
      expect((error as Error).message).toContain("boas-vindas@1");
      expect((error as Error).message).toContain("firstName");
      expect((error as Error).message).not.toContain("javascript:");
    }
  });
});

describe("defineEmailTemplate", () => {
  it("parses data through the schema before rendering", () => {
    const template = defineEmailTemplate<{ name: string }>({
      key: "teste",
      version: 2,
      description: "Template de teste",
      schema: z.object({ name: z.string().trim().min(1) }),
      render: (data) => ({ subject: `Oi ${data.name}`, html: `<p>${escapeHtml(data.name)}</p>`, text: data.name }),
    });

    expect(template.parse({ name: "  Bia  " })).toEqual({ name: "Bia" });
    expect(template.render({ name: "  Bia  " })).toEqual({ subject: "Oi Bia", html: "<p>Bia</p>", text: "Bia" });
    expect(() => template.render({})).toThrow(EmailTemplateDataError);
  });

  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
