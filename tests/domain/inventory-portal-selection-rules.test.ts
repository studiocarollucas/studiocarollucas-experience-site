// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  countShootPreferences,
  DEFAULT_OUTFIT_PREFERENCE_LIMIT,
  eligiblePortalInventoryTypes,
  inventoryPreferenceInputSchema,
  isPortalSelectableType,
  isPortalSelectionOpen,
  portalItemAvailability,
  portalPreferenceLimits,
} from "@/domain/inventory/portal-selection-rules";

const ITEM_ID = "00000000-0000-4000-8000-000000000011";
const openShoot = { status: "preparacao", shootDate: "2030-05-10", portalEnabled: true };

describe("portal inventory selection rules", () => {
  it("opens selection only for an enabled upcoming shoot in reserva/preparacao", () => {
    expect(isPortalSelectionOpen(openShoot, "2030-05-10")).toBe(true);
    expect(isPortalSelectionOpen({ ...openShoot, status: "reserva" }, "2030-05-01")).toBe(true);
    expect(isPortalSelectionOpen(openShoot, "2030-05-11")).toBe(false);
    expect(isPortalSelectionOpen({ ...openShoot, portalEnabled: false }, "2030-05-01")).toBe(false);
    for (const status of ["realizado", "edicao", "finalizado", "reveal", "entregue", "cancelado", "reagendado"]) {
      expect(isPortalSelectionOpen({ ...openShoot, status }, "2030-05-01")).toBe(false);
    }
  });

  it("derives preference limits from the package: outfits limit or default, clutch only when included", () => {
    expect(portalPreferenceLimits({ outfitsLimit: 2, clutchIncluded: true })).toEqual({ outfit: 2, clutch: 1 });
    expect(portalPreferenceLimits({ outfitsLimit: null, clutchIncluded: false })).toEqual({
      outfit: DEFAULT_OUTFIT_PREFERENCE_LIMIT,
      clutch: 0,
    });
    expect(portalPreferenceLimits({ outfitsLimit: 0, clutchIncluded: false })).toEqual({ outfit: 0, clutch: 0 });
    expect(portalPreferenceLimits(null)).toEqual({ outfit: 0, clutch: 0 });
  });

  it("only offers outfits and clutches with a positive limit, never accessories or props", () => {
    expect(eligiblePortalInventoryTypes({ outfit: 2, clutch: 1 })).toEqual(["outfit", "clutch"]);
    expect(eligiblePortalInventoryTypes({ outfit: 2, clutch: 0 })).toEqual(["outfit"]);
    expect(isPortalSelectableType({ outfit: 2, clutch: 1 }, "accessory")).toBe(false);
    expect(isPortalSelectableType({ outfit: 2, clutch: 1 }, "prop")).toBe(false);
    expect(isPortalSelectableType({ outfit: 2, clutch: 0 }, "clutch")).toBe(false);
    expect(isPortalSelectableType({ outfit: 2, clutch: 1 }, "clutch")).toBe(true);
  });

  it("distinguishes the client's preference, the studio's confirmation and unavailability", () => {
    expect(portalItemAvailability("confirmed", true)).toBe("reserved");
    expect(portalItemAvailability("pending", true)).toBe("preferred");
    expect(portalItemAvailability(null, true)).toBe("unavailable");
    expect(portalItemAvailability(null, false)).toBe("available");
  });

  it("counts pending and confirmed selections per type", () => {
    expect(
      countShootPreferences([
        { type: "outfit", status: "pending" },
        { type: "outfit", status: "confirmed" },
        { type: "outfit", status: "cancelled" },
        { type: "clutch", status: "confirmed" },
        { type: "prop", status: "confirmed" },
      ]),
    ).toEqual({ outfit: 2, clutch: 1 });
  });

  it("accepts only the item and the desired state, dropping any client or shoot id", () => {
    const parsed = inventoryPreferenceInputSchema.parse({
      inventoryItemId: ITEM_ID,
      preferred: true,
      clientId: "client-attacker",
      shootId: "shoot-attacker",
    });
    expect(parsed).toEqual({ inventoryItemId: ITEM_ID, preferred: true });
    expect(inventoryPreferenceInputSchema.safeParse({ inventoryItemId: "x", preferred: true }).success).toBe(false);
    expect(inventoryPreferenceInputSchema.safeParse({ inventoryItemId: ITEM_ID, preferred: "yes" }).success).toBe(false);
  });
});
