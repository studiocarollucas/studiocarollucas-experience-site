import type { QuizAnswers } from "@/domain/quiz/recommendation";

export const QUIZ_STEPS = [
  { id: "familySlug", title: "Qual experiência você quer viver?" },
  { id: "aesthetic", title: "Qual universo visual mais parece com você?", options: [["romantica", "Romântica"], ["classica", "Clássica"], ["intensa", "Intensa"], ["eterea", "Etérea"]] },
  { id: "feeling", title: "Como você quer se sentir quando olhar as fotos?", options: [["delicada", "Delicada"], ["poderosa", "Poderosa"], ["atemporal", "Atemporal"], ["magica", "Mágica"]] },
  { id: "production", title: "Quanto você quer transformar o espaço ao seu redor?", options: [["clean", "Clean editorial"], ["textura", "Textura e detalhes"], ["elaborado", "Cenário elaborado"], ["imersivo", "Ambientação imersiva"]] },
  { id: "looks", title: "Quantas versões de você quer explorar?", options: [["1", "Uma estética"], ["2", "Duas versões"], ["3", "Três ou mais"], ["group", "Com outras pessoas"]] },
  { id: "investment", title: "Qual faixa de investimento faz sentido para você?", options: [["up-to-500", "Até R$ 500"], ["up-to-700", "De R$ 501 a R$ 700"], ["up-to-1000", "De R$ 701 a R$ 1.000"], ["above-1000", "Acima de R$ 1.000"]] },
] as const;

export const QUIZ_LABELS: Record<Exclude<keyof QuizAnswers, "familySlug">, Record<string, string>> = {
  aesthetic: Object.fromEntries(QUIZ_STEPS[1].options),
  feeling: Object.fromEntries(QUIZ_STEPS[2].options),
  production: Object.fromEntries(QUIZ_STEPS[3].options),
  looks: Object.fromEntries(QUIZ_STEPS[4].options),
  investment: Object.fromEntries(QUIZ_STEPS[5].options),
};

export const PALETTE_CHOICES = [
  "Tons claros e delicados",
  "Rosé e românticos",
  "Vibrantes e intensos",
  "Neutros e atemporais",
  "Outra cor que imagino",
] as const;
