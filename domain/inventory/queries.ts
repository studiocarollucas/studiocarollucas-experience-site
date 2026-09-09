import "server-only";

import { and, asc, count, desc, eq, gte, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryItems, inventoryReservations } from "@/db/schema";
import { inventoryItemStatusValues, inventoryItemTypeValues } from "./schema";
import { requireInventoryCatalogActor } from "./authorization";

const blockingReservationStatuses = ["pending", "confirmed"] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type InventoryListFilters = {
  search?: string;
  type?: string;
  status?: string;
  color?: string;
  size?: string;
  page?: string | number;
  pageSize?: string | number;
};

export type NormalizedInventoryListFilters = {
  search?: string;
  type?: (typeof inventoryItemTypeValues)[number];
  status?: (typeof inventoryItemStatusValues)[number];
  color?: string;
  size?: string;
  page: number;
  pageSize: number;
};

export type FutureInventoryReservation = {
  id: string;
  startsOn: string;
  endsOn: string;
  status: (typeof blockingReservationStatuses)[number];
};

export type InventoryListRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: (typeof inventoryItemTypeValues)[number];
  color: string | null;
  size: string | null;
  status: (typeof inventoryItemStatusValues)[number];
  active: boolean;
  internalPrice: string | null;
  futureReservations: FutureInventoryReservation[];
};

export function normalizeInventoryListFilters(raw: InventoryListFilters): NormalizedInventoryListFilters {
  const trimmed = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
  const type = trimmed(raw.type);
  const status = trimmed(raw.status);
  const page = Math.max(1, Math.floor(Number(raw.page ?? 1)) || 1);
  const rawPageSize = Math.floor(Number(raw.pageSize ?? 25)) || 25;
  return {
    search: trimmed(raw.search),
    type: (inventoryItemTypeValues as readonly string[]).includes(type ?? "")
      ? type as NormalizedInventoryListFilters["type"]
      : undefined,
    status: (inventoryItemStatusValues as readonly string[]).includes(status ?? "")
      ? status as NormalizedInventoryListFilters["status"]
      : undefined,
    color: trimmed(raw.color),
    size: trimmed(raw.size),
    page,
    pageSize: Math.min(100, Math.max(1, rawPageSize)),
  };
}

function listPredicate(filters: NormalizedInventoryListFilters): SQL {
  const conditions: SQL[] = [];
  if (filters.search) {
    const like = `%${filters.search}%`;
    conditions.push(or(ilike(inventoryItems.code, like), ilike(inventoryItems.name, like)) as SQL);
  }
  if (filters.type) conditions.push(eq(inventoryItems.type, filters.type));
  if (filters.status) conditions.push(eq(inventoryItems.status, filters.status));
  if (filters.color) conditions.push(ilike(inventoryItems.color, `%${filters.color}%`));
  if (filters.size) conditions.push(ilike(inventoryItems.size, `%${filters.size}%`));
  return conditions.length ? and(...conditions) as SQL : sql`true`;
}

export async function listInventoryItems(filters: InventoryListFilters, actorUserId: string): Promise<{
  rows: InventoryListRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  await requireInventoryCatalogActor(actorUserId);
  const normalized = normalizeInventoryListFilters(filters);
  const where = listPredicate(normalized);
  const [{ total }] = await db.select({ total: count() }).from(inventoryItems).where(where);
  const items = await db
    .select({
      id: inventoryItems.id,
      code: inventoryItems.code,
      name: inventoryItems.name,
      description: inventoryItems.description,
      type: inventoryItems.type,
      color: inventoryItems.color,
      size: inventoryItems.size,
      status: inventoryItems.status,
      active: inventoryItems.active,
      internalPrice: inventoryItems.internalPrice,
    })
    .from(inventoryItems)
    .where(where)
    .orderBy(asc(inventoryItems.code), asc(inventoryItems.id))
    .limit(normalized.pageSize)
    .offset((normalized.page - 1) * normalized.pageSize);

  const ids = items.map((item) => item.id);
  const reservationRows = ids.length
    ? await db
        .select({
          id: inventoryReservations.id,
          inventoryItemId: inventoryReservations.inventoryItemId,
          startsOn: inventoryReservations.startsOn,
          endsOn: inventoryReservations.endsOn,
          status: inventoryReservations.status,
        })
        .from(inventoryReservations)
        .where(
          and(
            inArray(inventoryReservations.inventoryItemId, ids),
            inArray(inventoryReservations.status, blockingReservationStatuses),
            gte(inventoryReservations.endsOn, new Date().toISOString().slice(0, 10)),
          ),
        )
        .orderBy(asc(inventoryReservations.startsOn), asc(inventoryReservations.id))
    : [];
  const reservationsByItem = new Map<string, FutureInventoryReservation[]>();
  for (const reservation of reservationRows) {
    const list = reservationsByItem.get(reservation.inventoryItemId) ?? [];
    list.push({
      id: reservation.id,
      startsOn: reservation.startsOn,
      endsOn: reservation.endsOn,
      status: reservation.status as FutureInventoryReservation["status"],
    });
    reservationsByItem.set(reservation.inventoryItemId, list);
  }

  return {
    rows: items.map((item) => ({ ...item, futureReservations: reservationsByItem.get(item.id) ?? [] })),
    total: Number(total),
    page: normalized.page,
    pageSize: normalized.pageSize,
  };
}

export async function searchReservableInventoryItems(query: string, shootId: string, actorUserId: string): Promise<Array<{
  id: string;
  code: string;
  name: string;
  type: (typeof inventoryItemTypeValues)[number];
  status: "available";
}>> {
  await requireInventoryCatalogActor(actorUserId);
  // The caller owns the shoot context; availability itself remains in InventoryReservation.
  void shootId;
  const search = query.trim();
  const conditions: SQL[] = [eq(inventoryItems.active, true), eq(inventoryItems.status, "available")];
  if (search) {
    const like = `%${search}%`;
    conditions.push(or(ilike(inventoryItems.code, like), ilike(inventoryItems.name, like)) as SQL);
  }
  return db
    .select({
      id: inventoryItems.id,
      code: inventoryItems.code,
      name: inventoryItems.name,
      type: inventoryItems.type,
      status: inventoryItems.status,
    })
    .from(inventoryItems)
    .where(and(...conditions))
    .orderBy(asc(inventoryItems.code), asc(inventoryItems.id))
    .limit(25) as Promise<Array<{
      id: string;
      code: string;
      name: string;
      type: (typeof inventoryItemTypeValues)[number];
      status: "available";
    }>>;
}
