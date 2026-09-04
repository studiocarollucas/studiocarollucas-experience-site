import type { leadStatusEnum } from "@/db/schema";

export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];

const FORWARD_PIPELINE: LeadStatus[] = ["novo", "contato", "proposta", "negociacao", "ganho"];

const TERMINAL_STATES: LeadStatus[] = ["ganho", "perdido"];

export function canTransitionLeadStatus(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return false;
  if (TERMINAL_STATES.includes(from)) return false;

  if (to === "perdido") {
    return !TERMINAL_STATES.includes(from);
  }

  const fromIndex = FORWARD_PIPELINE.indexOf(from);
  const toIndex = FORWARD_PIPELINE.indexOf(to);
  return fromIndex !== -1 && toIndex === fromIndex + 1;
}
