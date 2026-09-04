import type { shootStatusEnum } from "@/db/schema";

export type ShootStatus = (typeof shootStatusEnum.enumValues)[number];

const FORWARD_PIPELINE: ShootStatus[] = [
  "reserva",
  "preparacao",
  "realizado",
  "edicao",
  "finalizado",
  "reveal",
  "entregue",
];

const TERMINAL_STATES: ShootStatus[] = ["entregue", "cancelado"];

// Once shooting has actually happened, "reagendado" (reschedule) no longer makes
// sense — the shoot occurred. Cancelado remains possible even after realizado
// (e.g. the client cancels editing/delivery), so it isn't in this list.
const PRE_SHOOT_STAGES: ShootStatus[] = ["reserva", "preparacao"];

export function canTransitionShootStatus(from: ShootStatus, to: ShootStatus): boolean {
  if (from === to) return false;
  if (TERMINAL_STATES.includes(from)) return false;

  if (to === "cancelado") {
    return true;
  }

  if (to === "reagendado") {
    return PRE_SHOOT_STAGES.includes(from);
  }

  if (from === "reagendado") {
    return to === "reserva";
  }

  const fromIndex = FORWARD_PIPELINE.indexOf(from);
  const toIndex = FORWARD_PIPELINE.indexOf(to);
  return fromIndex !== -1 && toIndex === fromIndex + 1;
}
