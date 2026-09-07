import type { PortalReference } from "@/domain/portal/types";
import { StylingBoard } from "@/components/client/styling-board";

export function StylingManager({
  shootId,
  viewerAuthUserId,
  references,
}: {
  shootId: string;
  viewerAuthUserId: string;
  references: PortalReference[];
}) {
  return (
    <StylingBoard
      shootId={shootId}
      viewerAuthUserId={viewerAuthUserId}
      references={references}
      origin="studio"
      canDeleteAll
    />
  );
}
