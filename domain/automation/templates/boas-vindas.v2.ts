import { z } from "zod";
import { defineEmailTemplate } from "./define";
import { civilDateSchema, firstNameSchema, formatShootMoment, greetingFor, httpUrlSchema, wallTimeSchema } from "./format";
import { escapeHtml, renderEmailButton, renderEmailLayout } from "./html";

const boasVindasV2Schema = z.object({
  firstName: firstNameSchema.optional(),
  shootDate: civilDateSchema,
  startTime: wallTimeSchema.optional(),
  /** Minha Experiência; only when the shoot's portal access is enabled. */
  portalUrl: httpUrlSchema.optional(),
});

type BoasVindasV2Data = z.output<typeof boasVindasV2Schema>;

/**
 * SCL-701: welcome sent once per confirmed reservation. Only the first name,
 * the date/time and a portal link — never price, notes, payment or staff data.
 */
export const boasVindasV2 = defineEmailTemplate<BoasVindasV2Data>({
  key: "boas-vindas",
  version: 2,
  description: "Boas-vindas após reserva confirmada, com data e CTA para Minha Experiência.",
  schema: boasVindasV2Schema,
  render: ({ firstName, shootDate, startTime, portalUrl }: BoasVindasV2Data) => {
    const subject = "Sua experiência no Stúdio Carol Lucas está confirmada";
    const greeting = greetingFor(firstName);
    const intro = `Que alegria ter você com a gente! Sua experiência está reservada para ${formatShootMoment(shootDate, startTime)}.`;
    const next = portalUrl
      ? "Em Minha Experiência você acompanha cada etapa — da preparação ao Reveal — e encontra o checklist para deixar tudo pronto com calma. Para entrar, use este mesmo e-mail."
      : "Nos próximos dias vamos cuidar com você de cada detalhe da preparação, até o Reveal.";
    const closing = "Qualquer dúvida, é só responder este e-mail.";

    const text = [
      greeting,
      "",
      intro,
      "",
      next,
      ...(portalUrl ? ["", `Acesse Minha Experiência: ${portalUrl}`] : []),
      "",
      closing,
      "",
      "Com carinho,",
      "Equipe Stúdio Carol Lucas",
    ].join("\n");

    const bodyHtml = [
      `<p style="margin:0 0 16px;font-size:22px;">${escapeHtml(greeting)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(next)}</p>`,
      portalUrl ? renderEmailButton("Acessar Minha Experiência", portalUrl) : "",
      `<p style="margin:0 0 16px;">${escapeHtml(closing)}</p>`,
      '<p style="margin:0;">Com carinho,<br>Equipe Stúdio Carol Lucas</p>',
    ]
      .filter(Boolean)
      .join("\n");

    return { subject, text, html: renderEmailLayout({ bodyHtml, preheader: intro }) };
  },
});
