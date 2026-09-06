import type { productionJobStatusEnum } from "@/db/schema";

export type ProductionJobStatus = (typeof productionJobStatusEnum.enumValues)[number];

const ORDER: ProductionJobStatus[] = ["aguardando", "iniciado", "parcial", "finalizado", "entregue"];

const TERMINAL_STATES: ProductionJobStatus[] = ["entregue"];

export function canTransitionProductionStatus(
  from: ProductionJobStatus,
  to: ProductionJobStatus
): boolean {
  if (from === to) return false;
  if (TERMINAL_STATES.includes(from)) return false;

  const fromIndex = ORDER.indexOf(from);
  const toIndex = ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1 || toIndex <= fromIndex) return false;

  // Allow skipping "parcial" specifically (not every job has a partial batch),
  // but never skip "iniciado" itself — a job must actually start before any
  // later state, and skipping straight past "finalizado" to "entregue" without
  // being finalized first is still disallowed by the toIndex - fromIndex === 1
  // check below for every other pair.
  if (from === "iniciado" && to === "finalizado") return true;

  return toIndex === fromIndex + 1;
}

// UI helper: the set of statuses the operator may move a job to right now. Derived
// from canTransitionProductionStatus so the dropdown and the guard can never drift.
export function allowedProductionTransitions(from: ProductionJobStatus): ProductionJobStatus[] {
  return ORDER.filter((to) => canTransitionProductionStatus(from, to));
}
