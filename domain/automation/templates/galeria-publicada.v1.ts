import { z } from "zod";
import { defineEmailTemplate } from "./define";
import { firstNameSchema, greetingFor, httpUrlSchema } from "./format";
import { escapeHtml, renderEmailButton, renderEmailLayout } from "./html";

const galeriaPublicadaSchema = z.object({
  firstName: firstNameSchema.optional(),
  /** Minha Experiência Reveal page: login required, never a token or signed URL. */
  revealUrl: httpUrlSchema,
});

type GaleriaPublicadaData = z.output<typeof galeriaPublicadaSchema>;

/** SCL-703: the Reveal is published. No photo previews or signed links in the email. */
export const galeriaPublicadaV1 = defineEmailTemplate<GaleriaPublicadaData>({
  key: "galeria-publicada",
  version: 1,
  description: "Reveal/galeria publicada, com link autenticado para Minha Experiência.",
  schema: galeriaPublicadaSchema,
  render: ({ firstName, revealUrl }: GaleriaPublicadaData) => {
    const subject = "Suas fotos estão prontas: chegou o seu Reveal";
    const greeting = greetingFor(firstName);
    const intro =
      "Chegou o momento que a gente mais ama: as fotos da sua experiência no Stúdio Carol Lucas estão prontas e o seu Reveal já está disponível.";
    const access =
      "O acesso é pessoal e protegido: entre em Minha Experiência com este mesmo e-mail para ver suas fotos.";
    const closing = "Esperamos que você se emocione tanto quanto a gente.";

    const text = [
      greeting,
      "",
      intro,
      "",
      access,
      "",
      `Ver meu Reveal: ${revealUrl}`,
      "",
      closing,
      "",
      "Com carinho,",
      "Equipe Stúdio Carol Lucas",
    ].join("\n");

    const bodyHtml = [
      `<p style="margin:0 0 16px;font-size:22px;">${escapeHtml(greeting)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(access)}</p>`,
      renderEmailButton("Ver meu Reveal", revealUrl),
      `<p style="margin:0 0 16px;">${escapeHtml(closing)}</p>`,
      '<p style="margin:0;">Com carinho,<br>Equipe Stúdio Carol Lucas</p>',
    ].join("\n");

    return { subject, text, html: renderEmailLayout({ bodyHtml, preheader: intro }) };
  },
});
