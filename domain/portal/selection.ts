import type { PortalShoot } from "./types";

function compareByDateThenId(left: PortalShoot, right: PortalShoot): number {
  return left.shootDate.localeCompare(right.shootDate) || left.id.localeCompare(right.id);
}

export function selectPortalShoot(shoots: PortalShoot[], today: string): PortalShoot | null {
  const eligible = shoots.filter((shoot) => shoot.portalEnabled && shoot.status !== "cancelado");
  const future = eligible
    .filter((shoot) => shoot.shootDate >= today && shoot.status !== "entregue")
    .sort(compareByDateThenId);

  if (future[0]) return future[0];

  return (
    eligible
      .filter((shoot) => shoot.shootDate <= today)
      .sort((left, right) => compareByDateThenId(right, left))[0] ?? null
  );
}
