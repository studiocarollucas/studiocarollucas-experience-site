import { describe, it, expect } from "vitest";
import { canTransitionShootStatus } from "@/domain/shoots/status";

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
