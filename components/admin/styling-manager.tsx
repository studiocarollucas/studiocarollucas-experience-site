"use client";

import type { PortalReference } from "@/domain/portal/types";
import { StylingBoard } from "@/components/client/styling-board";
import { StylingInventoryLink, type StylingInventoryOption } from "./styling-inventory-link";

export function StylingManager({
  shootId,
  viewerAuthUserId,
  references,
  inventoryItems = [],
  inventoryLinksAvailable = true,
}: {
  shootId: string;
  viewerAuthUserId: string;
  references: PortalReference[];
  inventoryItems?: StylingInventoryOption[];
  inventoryLinksAvailable?: boolean;
}) {
  return (
    <StylingBoard
      shootId={shootId}
      viewerAuthUserId={viewerAuthUserId}
      references={references}
      origin="studio"
      canDeleteAll
      renderInventoryLink={inventoryLinksAvailable ? (reference) => (
        <StylingInventoryLink
          shootId={shootId} referenceId={reference.id}
          label={reference.caption?.trim() || "referência sem legenda"}
          value={reference.inventoryLink?.inventoryItemId ?? null} items={inventoryItems}
        />
      ) : undefined}
    />
  );
}
