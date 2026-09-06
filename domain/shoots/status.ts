// `import type` on purpose: this module is imported by a "use client" component
// (agenda/[id]/shoot-status-control.tsx), and a value import of the Drizzle enum
// would drag drizzle-orm/pg-core into the browser bundle for nothing.
import type { shootStatusEnum } from "@/db/schema";

export type ShootStatus = (typeof shootStatusEnum.enumValues)[number];

// Every shoot_status value, in DB-enum order. Completeness and ordering are
// guarded by tests/domain/shoot-status.test.ts, which iterates the real
// shootStatusEnum.enumValues and asserts this list offers exactly what
// canTransitionShootStatus accepts — so a new enum value can't silently go missing.
const ALL_STATUSES: ShootStatus[] = [
  "reserva",
  "preparacao",
  "realizado",
  "edicao",
  "finalizado",
  "reveal",
  "entregue",
  "cancelado",
  "reagendado",
];

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

// UI helper: the set of statuses the operator may move a shoot to right now.
// Derived from canTransitionShootStatus over the DB enum, so the dropdown and the
// guard can never drift. Mirrors allowedProductionTransitions in
// domain/production/status.ts.
export function allowedShootTransitions(from: ShootStatus): ShootStatus[] {
  return ALL_STATUSES.filter((to) => canTransitionShootStatus(from, to));
}
