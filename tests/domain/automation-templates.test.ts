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
    expect(getLatestEmailTemplate("boas-vindas")).toMatchObject({ key: "boas-vindas", version: 2 });
    expect(getEmailTemplate("boas-vindas", 1)).toMatchObject({ key: "boas-vindas", version: 1 });
    expect(getEmailTemplate("boas-vindas", 2)).toMatchObject({ key: "boas-vindas", version: 2 });
    expect(getLatestEmailTemplate("lembrete-d7")).toMatchObject({ version: 1 });
    expect(getLatestEmailTemplate("lembrete-d1")).toMatchObject({ version: 1 });
    expect(getLatestEmailTemplate("galeria-publicada")).toMatchObject({ version: 1 });
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

const portalUrl = "https://studiocarollucas.com.br/minha-experiencia";

function expectNoInternalData(email: { subject: string; html: string; text: string }) {
  const all = `${email.subject}\n${email.html}\n${email.text}`;
  for (const internal of ["R$", "valor", "pagamento", "observaç", "notes", "undefined", "null"]) {
    expect(all).not.toContain(internal);
  }
}

describe("boas-vindas v2 (SCL-701)", () => {
  it("confirms the reservation with date, time and a Minha Experiência CTA", () => {
    const email = renderEmailTemplate("boas-vindas", 2, {
      firstName: "Ana",
      shootDate: "2026-10-12",
      startTime: "15:00",
      portalUrl,
    });

    expect(email.subject).toBe("Sua experiência no Stúdio Carol Lucas está confirmada");
    expect(email.text).toContain("Olá, Ana!");
    expect(email.text).toContain("segunda-feira, 12 de outubro, às 15:00");
    expect(email.text).toContain(`Acesse Minha Experiência: ${portalUrl}`);
    expect(email.html).toContain(`href="${portalUrl}"`);
    expect(email.html).toContain("Acessar Minha Experiência");
    expect(email.html).toContain('<html lang="pt-BR">');
    expectNoInternalData(email);
  });

  it("works without first name, time or portal access", () => {
    const email = renderEmailTemplate("boas-vindas", 2, { shootDate: "2026-10-12" });
    expect(email.text).toContain("Olá!");
    expect(email.text).toContain("segunda-feira, 12 de outubro.");
    expect(email.html).not.toContain("href=");
    expect(email.text).not.toContain("Acesse Minha Experiência");
    expectNoInternalData(email);
  });

  it("keeps v1 rendering unchanged for deliveries already pinned to it", () => {
    expect(renderEmailTemplate("boas-vindas", 1, { firstName: "Ana" }).subject).toBe("Boas-vindas ao Stúdio Carol Lucas");
  });

  it("rejects a malformed date or time", () => {
    expect(() => renderEmailTemplate("boas-vindas", 2, { shootDate: "12/10/2026" })).toThrow(EmailTemplateDataError);
    expect(() => renderEmailTemplate("boas-vindas", 2, { shootDate: "2026-10-12", startTime: "25:00" })).toThrow(
      EmailTemplateDataError,
    );
  });
});

describe("lembretes D-7 e D-1 (SCL-702)", () => {
  it("points D-7 to the preparation checklist", () => {
    const checklistUrl = `${portalUrl}/checklist`;
    const email = renderEmailTemplate("lembrete-d7", 1, {
      firstName: "Ana",
      shootDate: "2026-10-12",
      checklistUrl,
    });

    expect(email.subject).toBe("Sua experiência no Stúdio Carol Lucas está chegando");
    expect(email.text).toContain("segunda-feira, 12 de outubro");
    expect(email.text).toContain("figurinos");
    expect(email.text).toContain(`Ver minha preparação: ${checklistUrl}`);
    expect(email.html).toContain(`href="${checklistUrl}"`);
    expectNoInternalData(email);
  });

  it("sends D-1 for tomorrow with the portal shoot details link", () => {
    const shootUrl = `${portalUrl}/ensaio`;
    const email = renderEmailTemplate("lembrete-d1", 1, {
      firstName: "Ana",
      shootDate: "2026-10-06",
      startTime: "09:30",
      shootUrl,
    });

    expect(email.subject).toBe("Amanhã é o dia da sua experiência");
    expect(email.text).toContain("é amanhã, terça-feira, 6 de outubro, às 09:30");
    expect(email.html).toContain(`href="${shootUrl}"`);
    expectNoInternalData(email);
  });

  it("omits portal CTAs when the portal is not enabled", () => {
    for (const key of ["lembrete-d7", "lembrete-d1"]) {
      const email = renderEmailTemplate(key, 1, { shootDate: "2026-10-12" });
      expect(email.html).not.toContain("href=");
      expect(email.text).toContain("responda este e-mail");
    }
  });
});

describe("galeria-publicada v1 (SCL-703)", () => {
  it("links to the authenticated Reveal page without tokens", () => {
    const revealUrl = `${portalUrl}/reveal`;
    const email = renderEmailTemplate("galeria-publicada", 1, { firstName: "Ana", revealUrl });

    expect(email.subject).toBe("Suas fotos estão prontas: chegou o seu Reveal");
    expect(email.text).toContain(`Ver meu Reveal: ${revealUrl}`);
    expect(email.text).toContain("entre em Minha Experiência com este mesmo e-mail");
    expect(email.html).toContain(`href="${revealUrl}"`);
    expect(email.html).not.toContain("token");
    expectNoInternalData(email);
  });

  it("requires an http(s) Reveal link", () => {
    expect(() => renderEmailTemplate("galeria-publicada", 1, { firstName: "Ana" })).toThrow(EmailTemplateDataError);
    expect(() => renderEmailTemplate("galeria-publicada", 1, { revealUrl: "javascript:alert(1)" })).toThrow(
      EmailTemplateDataError,
    );
  });

  it("escapes interpolated names in every new template", () => {
    const firstName = '<b>"x"</b>';
    for (const [key, data] of [
      ["boas-vindas", { firstName, shootDate: "2026-10-12" }],
      ["lembrete-d7", { firstName, shootDate: "2026-10-12" }],
      ["lembrete-d1", { firstName, shootDate: "2026-10-12" }],
      ["galeria-publicada", { firstName, revealUrl: `${portalUrl}/reveal` }],
    ] as const) {
      const email = renderEmailTemplate(key, getLatestEmailTemplate(key).version, data);
      expect(email.html).not.toContain("<b>");
      expect(email.html).toContain("&lt;b&gt;&quot;x&quot;&lt;/b&gt;");
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
