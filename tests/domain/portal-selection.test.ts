import { describe, expect, it } from "vitest";
import { selectPortalShoot } from "@/domain/portal/selection";
import type { PortalShoot, PortalShootStatus } from "@/domain/portal/types";

function shoot(
  id: string,
  shootDate: string,
  status: PortalShootStatus = "preparacao",
  portalEnabled = true
): PortalShoot {
  return {
    id,
    shootDate,
    status,
    portalEnabled,
    clientId: "client-1",
    experiencePackageId: "package-1",
    startTime: null,
    agreedPrice: "1000.00",
    paymentStatus: "nao_iniciado",
    locationName: null,
    locationAddress: null,
    clientGuidance: null,
  };
}

describe("selectPortalShoot", () => {
  it("selects the nearest future active shoot regardless of input order", () => {
    expect(
      selectPortalShoot(
        [shoot("past", "2026-09-01"), shoot("later", "2026-10-10"), shoot("next", "2026-09-18")],
        "2026-09-06"
      )?.id
    ).toBe("next");
  });

  it("skips a delivered future row and selects same-day active", () => {
    expect(
      selectPortalShoot(
        [shoot("delivered-future", "2026-09-20", "entregue"), shoot("same-day", "2026-09-06")],
        "2026-09-06"
      )?.id
    ).toBe("same-day");
  });

  it("falls back to the most recent past row including delivered", () => {
    expect(
      selectPortalShoot(
        [shoot("older", "2026-08-01"), shoot("delivered-past", "2026-09-01", "entregue")],
        "2026-09-06"
      )?.id
    ).toBe("delivered-past");
  });

  it("excludes cancelled and portal-disabled rows", () => {
    expect(
      selectPortalShoot(
        [
          shoot("cancelled", "2026-09-10", "cancelado"),
          shoot("disabled", "2026-09-11", "preparacao", false),
        ],
        "2026-09-06"
      )
    ).toBeNull();
  });

  it("returns null for no rows", () => {
    expect(selectPortalShoot([], "2026-09-06")).toBeNull();
  });

  it("breaks same-date ties by id without mutating the input", () => {
    const shoots = [shoot("zeta", "2026-09-18"), shoot("alpha", "2026-09-18")];

    expect(selectPortalShoot(shoots, "2026-09-06")?.id).toBe("alpha");
    expect(shoots.map((item) => item.id)).toEqual(["zeta", "alpha"]);
  });
});
