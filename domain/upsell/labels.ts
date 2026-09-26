import type { UpsellOrderStatus, UpsellProductKind } from "@/db/schema/upsell";

// Client-safe pt-BR labels (no runtime imports), shared by Admin and portal.

export const upsellProductKindLabels: Record<UpsellProductKind, string> = {
  foto_adicional: "Foto adicional",
  colecao_completa: "Coleção completa",
  album: "Álbum",
  quadro: "Quadro / impressão",
  reel_stories: "Reel / Stories",
  outro: "Outro",
};

export const upsellOrderStatusLabels: Record<UpsellOrderStatus, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const upsellPaymentStatusLabels: Record<"nao_iniciado" | "parcial" | "pago", string> = {
  nao_iniciado: "Não pago",
  parcial: "Pago em parte",
  pago: "Pago",
};

export const upsellProductKinds = Object.keys(upsellProductKindLabels) as UpsellProductKind[];
export const upsellOrderStatuses = Object.keys(upsellOrderStatusLabels) as UpsellOrderStatus[];
