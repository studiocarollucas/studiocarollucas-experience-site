import { describe, it, expect } from "vitest";
import {
  canTransitionShootStatus,
  allowedShootTransitions,
  type ShootStatus,
} from "@/domain/shoots/status";
import { shootStatusEnum } from "@/db/schema";

describe("canTransitionShootStatus", () => {
  it("allows the forward pipeline in order", () => {
    expect(canTransitionShootStatus("reserva", "preparacao")).toBe(true);
    expect(canTransitionShootStatus("preparacao", "realizado")).toBe(true);
    expect(canTransitionShootStatus("realizado", "edicao")).toBe(true);
    expect(canTransitionShootStatus("edicao", "finalizado")).toBe(true);
    expect(canTransitionShootStatus("finalizado", "reveal")).toBe(true);
    expect(canTransitionShootStatus("reveal", "entregue")).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(canTransitionShootStatus("reserva", "realizado")).toBe(false);
    expect(canTransitionShootStatus("reserva", "entregue")).toBe(false);
  });

  it("allows cancelado from any non-terminal active stage", () => {
    expect(canTransitionShootStatus("reserva", "cancelado")).toBe(true);
    expect(canTransitionShootStatus("preparacao", "cancelado")).toBe(true);
    expect(canTransitionShootStatus("edicao", "cancelado")).toBe(true);
  });

  it("allows reagendado only from pre-realizado stages", () => {
    expect(canTransitionShootStatus("reserva", "reagendado")).toBe(true);
    expect(canTransitionShootStatus("preparacao", "reagendado")).toBe(true);
    expect(canTransitionShootStatus("realizado", "reagendado")).toBe(false);
    expect(canTransitionShootStatus("edicao", "reagendado")).toBe(false);
  });

  it("rejects any transition out of a terminal state", () => {
    expect(canTransitionShootStatus("entregue", "reveal")).toBe(false);
    expect(canTransitionShootStatus("cancelado", "reserva")).toBe(false);
  });

  it("allows reagendado back to reserva", () => {
    expect(canTransitionShootStatus("reagendado", "reserva")).toBe(true);
  });
});

// The "which options does the UI offer" helper contract, mirroring
// tests/domain/change-production-status.test.ts for allowedProductionTransitions.
describe("allowedShootTransitions", () => {
  it("from reserva offers the next pipeline stage plus cancelado and reagendado", () => {
    expect(allowedShootTransitions("reserva")).toEqual(["preparacao", "cancelado", "reagendado"]);
  });

  it("from entregue offers nothing (terminal)", () => {
    expect(allowedShootTransitions("entregue")).toEqual([]);
  });

  it("from cancelado offers nothing (terminal)", () => {
    expect(allowedShootTransitions("cancelado")).toEqual([]);
  });

  it("from realizado drops reagendado but keeps the pipeline and cancelado", () => {
    expect(allowedShootTransitions("realizado")).toEqual(["edicao", "cancelado"]);
  });

  it("from reagendado offers only reserva and cancelado", () => {
    expect(allowedShootTransitions("reagendado")).toEqual(["reserva", "cancelado"]);
  });

  it("every offered transition passes canTransitionShootStatus", () => {
    for (const from of shootStatusEnum.enumValues) {
      for (const to of allowedShootTransitions(from)) {
        expect(canTransitionShootStatus(from, to)).toBe(true);
      }
    }
  });

  it("never offers a transition canTransitionShootStatus would reject", () => {
    for (const from of shootStatusEnum.enumValues) {
      const offered = new Set<ShootStatus>(allowedShootTransitions(from));
      for (const to of shootStatusEnum.enumValues) {
        expect(offered.has(to)).toBe(canTransitionShootStatus(from, to));
      }
    }
  });
});
