import { z } from "zod";
import { defineEmailTemplate } from "./define";
import { civilDateSchema, firstNameSchema, formatShootMoment, greetingFor, httpUrlSchema, wallTimeSchema } from "./format";
import { escapeHtml, renderEmailButton, renderEmailLayout } from "./html";

const lembreteD1Schema = z.object({
  firstName: firstNameSchema.optional(),
  shootDate: civilDateSchema,
  startTime: wallTimeSchema.optional(),
  /** Shoot details (location and guidance) in Minha Experiência; only when enabled. */
  shootUrl: httpUrlSchema.optional(),
});

type LembreteD1Data = z.output<typeof lembreteD1Schema>;

/**
 * SCL-702: the day before. Location and guidance stay in the portal (behind
 * login) instead of being copied into the email.
 */
export const lembreteD1V1 = defineEmailTemplate<LembreteD1Data>({
  key: "lembrete-d1",
  version: 1,
  description: "Lembrete D-1: a experiência é amanhã; detalhes e orientações no portal.",
  schema: lembreteD1Schema,
  render: ({ firstName, shootDate, startTime, shootUrl }: LembreteD1Data) => {
    const subject = "Amanhã é o dia da sua experiência";
    const greeting = greetingFor(firstName);
    const intro = `Está chegando a hora: sua experiência no Stúdio Carol Lucas é amanhã, ${formatShootMoment(shootDate, startTime)}.`;
    const details = shootUrl
      ? "O local e as orientações para o dia estão em Minha Experiência — entre com este mesmo e-mail."
      : "Se tiver qualquer dúvida sobre o local ou o horário, é só responder este e-mail.";
    const tips = "Descanse bem, beba bastante água e chegue com alguns minutos de antecedência. O resto é com a gente.";

    const text = [
      greeting,
      "",
      intro,
      "",
      details,
      ...(shootUrl ? ["", `Ver detalhes do ensaio: ${shootUrl}`] : []),
      "",
      tips,
      "",
      "Até amanhã!",
      "Equipe Stúdio Carol Lucas",
    ].join("\n");

    const bodyHtml = [
      `<p style="margin:0 0 16px;font-size:22px;">${escapeHtml(greeting)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(details)}</p>`,
      shootUrl ? renderEmailButton("Ver detalhes do ensaio", shootUrl) : "",
      `<p style="margin:0 0 16px;">${escapeHtml(tips)}</p>`,
      '<p style="margin:0;">Até amanhã!<br>Equipe Stúdio Carol Lucas</p>',
    ]
      .filter(Boolean)
      .join("\n");

    return { subject, text, html: renderEmailLayout({ bodyHtml, preheader: intro }) };
  },
});
