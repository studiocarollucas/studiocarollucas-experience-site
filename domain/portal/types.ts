export type PortalShootStatus =
  | "reserva"
  | "preparacao"
  | "realizado"
  | "edicao"
  | "finalizado"
  | "reveal"
  | "entregue"
  | "cancelado"
  | "reagendado";

export type PortalShoot = {
  id: string;
  clientId: string;
  experiencePackageId: string;
  shootDate: string;
  startTime: string | null;
  status: PortalShootStatus;
  agreedPrice: string;
  paymentStatus: string;
  portalEnabled: boolean;
  locationName: string | null;
  locationAddress: string | null;
  clientGuidance: string | null;
};

export type PortalTask = {
  id: string;
  shootId: string;
  type: string;
  title: string;
  status: "pendente" | "em_andamento" | "concluida";
  dueAt: string | null;
  visibleToClient: boolean;
  clientActionable: boolean;
  completedAt: string | null;
  createdAt: string;
};

export type PortalPayment = {
  id: string;
  shootId: string;
  amount: string;
  paidAt: string | null;
  status: "confirmado";
};
