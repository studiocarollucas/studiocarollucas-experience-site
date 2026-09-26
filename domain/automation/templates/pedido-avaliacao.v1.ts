import { z } from "zod";
import { defineEmailTemplate } from "./define";
import { firstNameSchema, greetingFor, httpUrlSchema } from "./format";
import { escapeHtml, renderEmailButton, renderEmailLayout } from "./html";

const pedidoAvaliacaoSchema = z.object({
  firstName: firstNameSchema.optional(),
  /** Studio's public Google review link (STUDIO_GOOGLE_REVIEW_URL), pinned at enqueue. */
  reviewUrl: httpUrlSchema,
});

type PedidoAvaliacaoData = z.output<typeof pedidoAvaliacaoSchema>;

/**
 * SCL-704: one invitation to review the studio on Google, a few days after the
 * delivery. No incentives, no requested rating and no satisfaction filter: every
 * eligible client gets the same text.
 */
export const pedidoAvaliacaoV1 = defineEmailTemplate<PedidoAvaliacaoData>({
  key: "pedido-avaliacao",
  version: 1,
  description: "Pedido de avaliação no Google após a entrega das fotos.",
  schema: pedidoAvaliacaoSchema,
  render: ({ firstName, reviewUrl }: PedidoAvaliacaoData) => {
    const subject = "Como foi a sua experiência no Stúdio Carol Lucas?";
    const greeting = greetingFor(firstName);
    const intro =
      "Foi um prazer fazer parte da sua história. Esperamos que você esteja aproveitando cada foto da sua experiência.";
    const ask =
      "Se fizer sentido para você, contar como foi em uma avaliação no Google ajuda outras pessoas a conhecerem o estúdio. Leva só um minuto.";
    const noPressure = "E se preferir não avaliar, tudo bem: seu carinho já chegou até a gente.";

    const text = [
      greeting,
      "",
      intro,
      "",
      ask,
      "",
      `Avaliar no Google: ${reviewUrl}`,
      "",
      noPressure,
      "",
      "Com carinho,",
      "Equipe Stúdio Carol Lucas",
    ].join("\n");

    const bodyHtml = [
      `<p style="margin:0 0 16px;font-size:22px;">${escapeHtml(greeting)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(ask)}</p>`,
      renderEmailButton("Avaliar no Google", reviewUrl),
      `<p style="margin:0 0 16px;">${escapeHtml(noPressure)}</p>`,
      '<p style="margin:0;">Com carinho,<br>Equipe Stúdio Carol Lucas</p>',
    ].join("\n");

    return { subject, text, html: renderEmailLayout({ bodyHtml, preheader: intro }) };
  },
});
