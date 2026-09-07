export const PRICE_BANDS = [
  { id: "up-to-500", label: "Até R$ 500", maxCents: 50_000 },
  { id: "up-to-700", label: "De R$ 501 a R$ 700", minCents: 50_001, maxCents: 70_000 },
  { id: "up-to-1000", label: "De R$ 701 a R$ 1.000", minCents: 70_001, maxCents: 100_000 },
  { id: "above-1000", label: "Acima de R$ 1.000", minCents: 100_001 },
] as const;

export type InvestmentBand = (typeof PRICE_BANDS)[number]["id"];
export type QuizAnswers = {
  familySlug: string;
  aesthetic: "romantica" | "classica" | "intensa" | "eterea";
  feeling: "delicada" | "poderosa" | "atemporal" | "magica";
  production: "clean" | "textura" | "elaborado" | "imersivo";
  looks: "1" | "2" | "3" | "group";
  investment: InvestmentBand;
};

export type ServerQuizPackage = {
  id: string;
  familySlug: string;
  name: string;
  basePrice: string;
  outfitsLimit: number | null;
  sceneCount: number | null;
  participantLimit: number | null;
  paletteEligible: boolean;
};

export type QuizPersona = { name: string; copy: string; styling: string; sceneDirection: string };
export type QuizRecommendation = {
  package: ServerQuizPackage;
  persona: QuizPersona;
  usedClosestBudgetMatch: boolean;
};

export const PERSONAS: Record<QuizAnswers["aesthetic"], QuizPersona> = {
  romantica: {
    name: "Romântica editorial",
    copy: "Delicadeza, presença e detalhes que fazem o retrato parecer só seu.",
    styling: "Texturas suaves, movimento e pontos de brilho escolhidos com intenção.",
    sceneDirection: "Uma cena envolvente, com cores que acolhem a sua história.",
  },
  classica: {
    name: "Clássica contemporânea",
    copy: "Uma imagem limpa, elegante e feita para continuar atual com o tempo.",
    styling: "Linhas bem definidas, cores equilibradas e acabamentos atemporais.",
    sceneDirection: "Uma composição precisa, com foco em expressão e presença.",
  },
  intensa: {
    name: "Intensa e autoral",
    copy: "Contraste, atitude e uma direção que deixa a sua presença ocupar a cena.",
    styling: "Cores marcantes, escolhas de moda e acessórios com personalidade.",
    sceneDirection: "Uma atmosfera de impacto, construída em camadas e com intenção.",
  },
  eterea: {
    name: "Etérea e luminosa",
    copy: "Leveza, imaginação e uma atmosfera que transforma o momento em memória.",
    styling: "Tons claros, transparências e detalhes que criam sensação de sonho.",
    sceneDirection: "Uma cena delicada, guiada por luz e texturas suaves.",
  },
};

function toCents(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function inPriceBand(basePrice: string, bandId: InvestmentBand) {
  const band = PRICE_BANDS.find((item) => item.id === bandId);
  if (!band) return false;
  const cents = toCents(basePrice);
  const minCents = "minCents" in band ? band.minCents : undefined;
  const maxCents = "maxCents" in band ? band.maxCents : undefined;
  return (minCents === undefined || cents >= minCents) && (maxCents === undefined || cents <= maxCents);
}

function desiredLooks(looks: QuizAnswers["looks"]) {
  if (looks === "group") return 2;
  return Number(looks);
}

function desiredScenes(production: QuizAnswers["production"]) {
  return { clean: 1, textura: 2, elaborado: 3, imersivo: 4 }[production];
}

function scorePackage(item: ServerQuizPackage, answers: QuizAnswers) {
  const looksScore = Math.abs((item.outfitsLimit ?? 1) - desiredLooks(answers.looks));
  const scenesScore = Math.abs((item.sceneCount ?? 1) - desiredScenes(answers.production));
  const groupPenalty = answers.looks === "group" && (item.participantLimit ?? 1) < 2 ? 3 : 0;
  return looksScore + scenesScore + groupPenalty;
}

export function recommendPackage(answers: QuizAnswers, packages: ServerQuizPackage[]): QuizRecommendation {
  const withinFamily = packages.filter((item) => item.familySlug === answers.familySlug);
  if (withinFamily.length === 0) throw new Error("família sem pacote elegível");
  const withinBudget = withinFamily.filter((item) => inPriceBand(item.basePrice, answers.investment));
  const candidates = withinBudget.length ? withinBudget : withinFamily;
  const chosen = [...candidates].sort(
    (a, b) =>
      scorePackage(a, answers) - scorePackage(b, answers) ||
      toCents(a.basePrice) - toCents(b.basePrice) ||
      a.name.localeCompare(b.name, "pt-BR"),
  )[0];
  return { package: chosen, persona: PERSONAS[answers.aesthetic], usedClosestBudgetMatch: withinBudget.length === 0 };
}
