import type { PortalShootStatus } from "./types";

export type JourneyState = { step: number; label: string; tip: string };

const JOURNEY: Record<PortalShootStatus, JourneyState> = {
  reserva: { step: 1, label: "Reserva confirmada", tip: "Sua experiência já começou." },
  preparacao: { step: 2, label: "Preparação", tip: "Vamos construir cada detalhe juntas." },
  reagendado: {
    step: 2,
    label: "Reorganizando sua data",
    tip: "O estúdio confirmará os próximos detalhes.",
  },
  realizado: {
    step: 3,
    label: "Ensaio realizado",
    tip: "Agora começa a curadoria das suas imagens.",
  },
  edicao: {
    step: 4,
    label: "Edição",
    tip: "Suas imagens estão recebendo o acabamento final.",
  },
  finalizado: { step: 4, label: "Reveal em preparação", tip: "Seu Reveal está quase pronto." },
  reveal: { step: 5, label: "Reveal disponível", tip: "É hora de viver suas imagens." },
  entregue: {
    step: 6,
    label: "Experiência entregue",
    tip: "Obrigada por confiar sua história ao estúdio.",
  },
  cancelado: {
    step: 0,
    label: "Ensaio cancelado",
    tip: "Fale com o estúdio se precisar de ajuda.",
  },
};

export function getJourney(status: PortalShootStatus): JourneyState {
  return { ...JOURNEY[status] };
}
