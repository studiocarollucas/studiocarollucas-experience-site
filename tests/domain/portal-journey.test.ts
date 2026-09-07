import { describe, expect, it } from "vitest";
import { getJourney } from "@/domain/portal/journey";
import type { PortalShootStatus } from "@/domain/portal/types";

const statuses: PortalShootStatus[] = [
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

describe("getJourney", () => {
  it("maps every status to client-facing copy", () => {
    for (const status of statuses) {
      expect(getJourney(status).label.length).toBeGreaterThan(0);
      expect(getJourney(status).tip.length).toBeGreaterThan(0);
    }
  });

  it("maps the active client journey phases", () => {
    expect(getJourney("preparacao")).toMatchObject({ step: 2, label: "Preparação" });
    expect(getJourney("edicao").tip).toMatch(/acabamento final/);
    expect(getJourney("finalizado").label).toMatch(/Reveal/);
    expect(getJourney("entregue").tip).toMatch(/Obrigada/);
  });

  it("isolates each caller from the journey map", () => {
    const journey = getJourney("edicao");
    journey.label = "Alterada";

    expect(getJourney("edicao").label).toBe("Edição");
  });
});
