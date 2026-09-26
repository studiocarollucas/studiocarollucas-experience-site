import { z } from "zod";
import { defineEmailTemplate } from "./define";
import { escapeHtml, renderEmailButton, renderEmailLayout } from "./html";

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value: string) => /^https?:\/\//i.test(value), "URL precisa usar http(s)");

const boasVindasSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  portalUrl: httpUrl.optional(),
});

type BoasVindasData = z.output<typeof boasVindasSchema>;

/**
 * Generic welcome used to exercise the pipeline. SCL-701 owns the real
 * post-reservation welcome and should ship it as version 2 (or a new key)
 * instead of editing this version in place.
 */
export const boasVindasV1 = defineEmailTemplate<BoasVindasData>({
  key: "boas-vindas",
  version: 1,
  description: "Boas-vindas genérica com link opcional para Minha Experiência.",
  schema: boasVindasSchema,
  render: ({ firstName, portalUrl }: BoasVindasData) => {
    const subject = "Boas-vindas ao Stúdio Carol Lucas";
    const greeting = `Olá, ${firstName}!`;
    const intro =
      "Que alegria ter você com a gente. A partir de agora, cada etapa da sua experiência no Stúdio Carol Lucas será acompanhada com cuidado — da preparação ao Reveal.";
    const closing = "Qualquer dúvida, é só responder este e-mail.";

    const text = [
      greeting,
      "",
      intro,
      ...(portalUrl ? ["", `Acompanhe tudo em Minha Experiência: ${portalUrl}`] : []),
      "",
      closing,
      "",
      "Com carinho,",
      "Equipe Stúdio Carol Lucas",
    ].join("\n");

    const bodyHtml = [
      `<p style="margin:0 0 16px;font-size:22px;">${escapeHtml(greeting)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>`,
      portalUrl ? renderEmailButton("Acessar Minha Experiência", portalUrl) : "",
      `<p style="margin:0 0 16px;">${escapeHtml(closing)}</p>`,
      '<p style="margin:0;">Com carinho,<br>Equipe Stúdio Carol Lucas</p>',
    ]
      .filter(Boolean)
      .join("\n");

    return { subject, text, html: renderEmailLayout({ bodyHtml, preheader: intro }) };
  },
});
