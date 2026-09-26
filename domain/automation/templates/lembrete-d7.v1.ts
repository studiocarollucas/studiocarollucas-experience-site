import { z } from "zod";
import { defineEmailTemplate } from "./define";
import { civilDateSchema, firstNameSchema, formatShootMoment, greetingFor, httpUrlSchema, wallTimeSchema } from "./format";
import { escapeHtml, renderEmailButton, renderEmailLayout } from "./html";

const lembreteD7Schema = z.object({
  firstName: firstNameSchema.optional(),
  shootDate: civilDateSchema,
  startTime: wallTimeSchema.optional(),
  /** Preparation checklist in Minha Experiência; only when the portal is enabled. */
  checklistUrl: httpUrlSchema.optional(),
});

type LembreteD7Data = z.output<typeof lembreteD7Schema>;

/**
 * SCL-702: preparation reminder about a week before the shoot. The copy names
 * the date instead of "7 dias" because a late run may send it a little later.
 */
export const lembreteD7V1 = defineEmailTemplate<LembreteD7Data>({
  key: "lembrete-d7",
  version: 1,
  description: "Lembrete D-7: a experiência está chegando; revisar a preparação no portal.",
  schema: lembreteD7Schema,
  render: ({ firstName, shootDate, startTime, checklistUrl }: LembreteD7Data) => {
    const subject = "Sua experiência no Stúdio Carol Lucas está chegando";
    const greeting = greetingFor(firstName);
    const intro = `Falta pouco: sua experiência acontece ${formatShootMoment(shootDate, startTime)}.`;
    const preparation =
      "Este é um ótimo momento para revisar a sua preparação — moodboard e referências, figurinos, clutch e acessórios, referência de maquiagem — e confirmar o horário com a gente.";
    const next = checklistUrl
      ? "Seu checklist está em Minha Experiência; é só entrar com este mesmo e-mail."
      : "Se ainda faltar alguma escolha, responda este e-mail e a gente ajuda.";
    const closing = "Estamos preparando tudo com muito carinho para você.";

    const text = [
      greeting,
      "",
      intro,
      "",
      preparation,
      "",
      next,
      ...(checklistUrl ? ["", `Ver minha preparação: ${checklistUrl}`] : []),
      "",
      closing,
      "",
      "Com carinho,",
      "Equipe Stúdio Carol Lucas",
    ].join("\n");

    const bodyHtml = [
      `<p style="margin:0 0 16px;font-size:22px;">${escapeHtml(greeting)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(preparation)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(next)}</p>`,
      checklistUrl ? renderEmailButton("Ver minha preparação", checklistUrl) : "",
      `<p style="margin:0 0 16px;">${escapeHtml(closing)}</p>`,
      '<p style="margin:0;">Com carinho,<br>Equipe Stúdio Carol Lucas</p>',
    ]
      .filter(Boolean)
      .join("\n");

    return { subject, text, html: renderEmailLayout({ bodyHtml, preheader: intro }) };
  },
});
