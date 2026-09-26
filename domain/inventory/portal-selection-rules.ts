import { z } from "zod";

// Pure rules for the client-portal inventory selection (SCL-554). A client
// preference is an inventory_reservations row with purpose 'shoot', the
// client's shoot_id and status 'pending'; staff confirmation turns it into
// 'confirmed'. No schema change is involved.

export type PortalInventoryType = "outfit" | "clutch" | "accessory" | "prop";
export type PortalSelectableType = "outfit" | "clutch";
export type PortalInventoryAvailability = "available" | "unavailable" | "preferred" | "reserved";

export type PortalInventoryPhoto = { id: string; signedUrl: string };

/** The only item fields that ever reach the client's browser. */
export type PortalInventoryItem = {
  id: string;
  name: string;
  type: PortalInventoryType;
  color: string | null;
  size: string | null;
  photos: PortalInventoryPhoto[];
  availability: PortalInventoryAvailability;
};

export type PortalInventoryLimits = Record<PortalSelectableType, number>;

export type PortalInventorySelection = {
  selectionOpen: boolean;
  limits: PortalInventoryLimits;
  used: PortalInventoryLimits;
  /** Items already preferred by the client or reserved by the studio for this shoot. */
  shootItems: PortalInventoryItem[];
  /** Eligible catalog items not yet linked to this shoot. */
  catalog: PortalInventoryItem[];
};

/** Used when the package says "a combinar" (outfits_limit is null). */
export const DEFAULT_OUTFIT_PREFERENCE_LIMIT = 3;
export const PORTAL_INVENTORY_PHOTO_LIMIT = 4;
export const PORTAL_INVENTORY_CATALOG_LIMIT = 100;
export const PORTAL_SELECTION_SHOOT_STATUSES = ["reserva", "preparacao"] as const;

export const inventoryPreferenceInputSchema = z.object({
  inventoryItemId: z.string().uuid(),
  preferred: z.boolean(),
});

export type InventoryPreferenceInput = z.infer<typeof inventoryPreferenceInputSchema>;

export function isPortalSelectionOpen(
  shoot: { status: string; shootDate: string; portalEnabled: boolean },
  today: string,
): boolean {
  return (
    shoot.portalEnabled &&
    (PORTAL_SELECTION_SHOOT_STATUSES as readonly string[]).includes(shoot.status) &&
    shoot.shootDate >= today
  );
}

export function portalPreferenceLimits(
  experience: { outfitsLimit: number | null; clutchIncluded: boolean } | null,
): PortalInventoryLimits {
  if (!experience) return { outfit: 0, clutch: 0 };
  return {
    outfit:
      experience.outfitsLimit === null
        ? DEFAULT_OUTFIT_PREFERENCE_LIMIT
        : Math.max(0, Math.floor(experience.outfitsLimit)),
    clutch: experience.clutchIncluded ? 1 : 0,
  };
}

export function isPortalSelectableType(
  limits: PortalInventoryLimits,
  type: string,
): type is PortalSelectableType {
  return (type === "outfit" || type === "clutch") && limits[type] > 0;
}

export function eligiblePortalInventoryTypes(limits: PortalInventoryLimits): PortalSelectableType[] {
  return (["outfit", "clutch"] as const).filter((type) => limits[type] > 0);
}

export function portalItemAvailability(
  ownStatus: "pending" | "confirmed" | null,
  blockedElsewhere: boolean,
): PortalInventoryAvailability {
  if (ownStatus === "confirmed") return "reserved";
  if (ownStatus === "pending") return "preferred";
  return blockedElsewhere ? "unavailable" : "available";
}

export function countShootPreferences(
  rows: Array<{ type: string; status: string }>,
): PortalInventoryLimits {
  const used: PortalInventoryLimits = { outfit: 0, clutch: 0 };
  for (const row of rows) {
    if (row.status !== "pending" && row.status !== "confirmed") continue;
    if (row.type === "outfit" || row.type === "clutch") used[row.type] += 1;
  }
  return used;
}
