import { describe, it, expect } from "vitest";
import { canTransitionProductionStatus } from "@/domain/production/status";

// Pure-rule coverage lives in tests/domain/production-status.test.ts already.
// This file adds the "which options does the UI offer" helper contract.
import { allowedProductionTransitions } from "@/domain/production/status";

describe("allowedProductionTransitions", () => {
  it("from aguardando offers only iniciado", () => {
    expect(allowedProductionTransitions("aguardando")).toEqual(["iniciado"]);
  });

  it("from iniciado offers parcial and finalizado (skip allowed)", () => {
    expect(allowedProductionTransitions("iniciado").sort()).toEqual(["finalizado", "parcial"]);
  });

  it("from entregue offers nothing (terminal)", () => {
    expect(allowedProductionTransitions("entregue")).toEqual([]);
  });

  it("every offered transition passes canTransitionProductionStatus", () => {
    for (const from of ["aguardando", "iniciado", "parcial", "finalizado", "entregue"] as const) {
      for (const to of allowedProductionTransitions(from)) {
        expect(canTransitionProductionStatus(from, to)).toBe(true);
      }
    }
  });
});
