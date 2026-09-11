function validatedWhatsAppUrl(): URL {
  const fallback = "https://wa.me/5592984140492";
  let url: URL;
  try {
    url = new URL(process.env.NEXT_PUBLIC_STUDIO_WHATSAPP_URL || fallback);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "wa.me" ||
      !/^\/\d{10,15}$/.test(url.pathname)
    )
      url = new URL(fallback);
  } catch {
    url = new URL(fallback);
  }
  return url;
}

export function contactUrl(experience?: string) {
  const url = validatedWhatsAppUrl();
  url.searchParams.set(
    "text",
    experience
      ? `Olá! Quero conhecer a experiência ${experience} do Stúdio Carol Lucas.`
      : "Olá! Quero conversar sobre uma experiência fotográfica no Stúdio Carol Lucas."
  );
  return url.toString();
}

export type QuizContactContext = {
  familyName: string;
  packageName: string;
  persona: string;
  production: string;
  looks: string;
  investment: string;
  palette?: string;
};

export function quizContactUrl(context: QuizContactContext) {
  const url = validatedWhatsAppUrl();
  url.searchParams.set("text", [
    "Olá! Fiz a curadoria no site do Stúdio Carol Lucas.",
    `Ensaio: ${context.familyName}`,
    `Pacote recomendado: ${context.packageName}`,
    `Estética: ${context.persona}`,
    `Produção: ${context.production}`,
    `Looks: ${context.looks}`,
    `Faixa escolhida: ${context.investment}`,
    context.palette?.trim() ? `Paleta inicial: ${context.palette.trim()}` : null,
  ].filter(Boolean).join("\n"));
  return url.toString();
}

export type PaixaoClutchContactContext = {
  name: string;
  formattedPrice: string;
};

export function paixaoClutchContactUrl({ name, formattedPrice }: PaixaoClutchContactContext) {
  const url = validatedWhatsAppUrl();
  url.searchParams.set(
    "text",
    `Olá! Quero consultar a disponibilidade da clutch ${name}, aluguel de ${formattedPrice}.`,
  );
  return url.toString();
}
