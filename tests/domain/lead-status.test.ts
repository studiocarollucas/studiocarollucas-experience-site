import { describe, it, expect } from "vitest";
import { canTransitionLeadStatus } from "@/domain/leads/status";

describe("canTransitionLeadStatus", () => {
  it("allows the forward pipeline: novo -> contato -> proposta -> negociacao -> ganho", () => {
    expect(canTransitionLeadStatus("novo", "contato")).toBe(true);
    expect(canTransitionLeadStatus("contato", "proposta")).toBe(true);
    expect(canTransitionLeadStatus("proposta", "negociacao")).toBe(true);
    expect(canTransitionLeadStatus("negociacao", "ganho")).toBe(true);
  });

  it("allows perdido from any active stage", () => {
    expect(canTransitionLeadStatus("novo", "perdido")).toBe(true);
    expect(canTransitionLeadStatus("contato", "perdido")).toBe(true);
    expect(canTransitionLeadStatus("proposta", "perdido")).toBe(true);
    expect(canTransitionLeadStatus("negociacao", "perdido")).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(canTransitionLeadStatus("novo", "proposta")).toBe(false);
    expect(canTransitionLeadStatus("novo", "ganho")).toBe(false);
  });

  it("rejects any transition out of a terminal state", () => {
    expect(canTransitionLeadStatus("ganho", "contato")).toBe(false);
    expect(canTransitionLeadStatus("perdido", "novo")).toBe(false);
    expect(canTransitionLeadStatus("perdido", "contato")).toBe(false);
  });

  it("rejects a no-op transition", () => {
    expect(canTransitionLeadStatus("contato", "contato")).toBe(false);
  });
});
