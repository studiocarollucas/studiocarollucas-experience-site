import { describe, it, expect } from "vitest";
import { canTransitionProductionStatus } from "@/domain/production/status";

describe("canTransitionProductionStatus", () => {
  it("allows the linear pipeline in order", () => {
    expect(canTransitionProductionStatus("aguardando", "iniciado")).toBe(true);
    expect(canTransitionProductionStatus("iniciado", "parcial")).toBe(true);
    expect(canTransitionProductionStatus("parcial", "finalizado")).toBe(true);
    expect(canTransitionProductionStatus("finalizado", "entregue")).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(canTransitionProductionStatus("aguardando", "finalizado")).toBe(false);
    expect(canTransitionProductionStatus("iniciado", "entregue")).toBe(false);
  });

  it("rejects any transition out of the terminal state", () => {
    expect(canTransitionProductionStatus("entregue", "finalizado")).toBe(false);
  });

  it("rejects a no-op transition", () => {
    expect(canTransitionProductionStatus("iniciado", "iniciado")).toBe(false);
  });

  it("allows iniciado to skip directly to finalizado (small job, no partial batch)", () => {
    // PRD's diagram shows a strictly linear pipeline, but the plan's own Shoot
    // status rules allow skip-free stages only — for ProductionJob specifically,
    // "parcial" represents a partial photo batch delivery, which not every job
    // has (a small shoot might finish all editing in one pass). Documented here
    // rather than silently assumed: this is the one deliberate deviation from a
    // strictly linear PRD diagram in this plan, because forcing every job through
    // an unused "parcial" state would misrepresent real production status.
    expect(canTransitionProductionStatus("iniciado", "finalizado")).toBe(true);
  });
});
