// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock("@/db/client", () => ({ db: { select: mocks.select } }));

import {
  listInventoryItems,
  normalizeInventoryListFilters,
  searchReservableInventoryItems,
} from "@/domain/inventory/queries";

const itemId = "00000000-0000-4000-8000-000000000002";
const shootId = "00000000-0000-4000-8000-000000000003";
const actorUserId = "00000000-0000-4000-8000-000000000001";
const dialect = new PgDialect();

function chain(result: unknown) {
  const offset = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ offset });
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy });
  return {
    from: vi.fn().mockReturnValue({ where }),
    where,
    orderBy,
    limit,
    offset,
  };
}

function reservationChain(result: unknown) {
  const orderBy = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ orderBy });
  return {
    from: vi.fn().mockReturnValue({ where }),
    where,
    orderBy,
  };
}

function searchChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy });
  return {
    from: vi.fn().mockReturnValue({ where }),
    where,
    orderBy,
    limit,
  };
}

function roleResult(role: string | undefined) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(role ? [{ role }] : []) }),
    }),
  };
}

function render(condition: Parameters<PgDialect["sqlToQuery"]>[0]) {
  return dialect.sqlToQuery(condition);
}

describe("inventory catalog queries", () => {
  beforeEach(() => vi.resetAllMocks());

  it("normalizes searchable filters and bounds deterministic pagination", () => {
    expect(
      normalizeInventoryListFilters({
        search: "  dourada ",
        type: "clutch",
        status: "maintenance",
        color: "  gold ",
        size: " M ",
        page: "0",
        pageSize: "500",
      }),
    ).toEqual({
      search: "dourada",
      type: "clutch",
      status: "maintenance",
      color: "gold",
      size: "M",
      page: 1,
      pageSize: 100,
    });
  });

  it("lists code/name matches with type, status, color, and size filters plus future reservations", async () => {
    const futureReservations = [{ id: "reservation-id", startsOn: "2030-05-10", endsOn: "2030-05-12", status: "confirmed" }];
    const total = { from: vi.fn(), where: vi.fn().mockResolvedValue([{ total: 1 }]) };
    total.from.mockReturnValue({ where: total.where });
    const items = chain([{ id: itemId, code: "CL-001", name: "Clutch dourada", type: "clutch" }]);
    const reservations = reservationChain([{ ...futureReservations[0], inventoryItemId: itemId }]);
    mocks.select
      .mockReturnValueOnce(roleResult("staff"))
      .mockReturnValueOnce(total)
      .mockReturnValueOnce(items)
      .mockReturnValueOnce(reservations);

    await expect(
      listInventoryItems({ search: "dourada", type: "clutch", status: "available", color: "gold", size: "M", page: 2, pageSize: 10 }, actorUserId),
    ).resolves.toEqual({
      rows: [{ id: itemId, code: "CL-001", name: "Clutch dourada", type: "clutch", futureReservations }],
      total: 1,
      page: 2,
      pageSize: 10,
    });

    const itemPredicate = render(items.where.mock.calls[0]?.[0]);
    expect(itemPredicate.sql).toContain('"inventory_items"."code" ilike $1');
    expect(itemPredicate.sql).toContain('"inventory_items"."name" ilike $2');
    expect(itemPredicate.sql).toContain('"inventory_items"."type" = $3');
    expect(itemPredicate.sql).toContain('"inventory_items"."status" = $4');
    expect(itemPredicate.sql).toContain('"inventory_items"."color" ilike $5');
    expect(itemPredicate.sql).toContain('"inventory_items"."size" ilike $6');
    expect(itemPredicate.params).toEqual(["%dourada%", "%dourada%", "clutch", "available", "%gold%", "%M%"]);

    const reservationPredicate = render(reservations.where.mock.calls[0]?.[0]);
    expect(reservationPredicate.sql).toContain('"inventory_reservations"."inventory_item_id" in ($1)');
    expect(reservationPredicate.sql).toContain('"inventory_reservations"."status" in ($2, $3)');
    expect(reservationPredicate.sql).toContain('"inventory_reservations"."ends_on" >= $4');
    expect(reservationPredicate.params.slice(0, 3)).toEqual([itemId, "pending", "confirmed"]);
  });

  it("searches active available items by code or name and never offers maintenance, retired, or inactive inventory", async () => {
    const results = [{ id: itemId, code: "CL-001", name: "Clutch dourada", type: "clutch", status: "available" }];
    const search = searchChain(results);
    mocks.select.mockReturnValueOnce(roleResult("admin")).mockReturnValueOnce(search);

    await expect(searchReservableInventoryItems("CL-001", shootId, actorUserId)).resolves.toEqual(results);

    const predicate = render(search.where.mock.calls[0]?.[0]);
    expect(predicate.sql).toContain('"inventory_items"."active" = $1');
    expect(predicate.sql).toContain('"inventory_items"."status" = $2');
    expect(predicate.sql).toContain('"inventory_items"."code" ilike $3');
    expect(predicate.sql).toContain('"inventory_items"."name" ilike $4');
    expect(predicate.params).toEqual([true, "available", "%CL-001%", "%CL-001%"]);
  });

  it.each([
    ["listInventoryItems", () => listInventoryItems({}, actorUserId)],
    ["searchReservableInventoryItems", () => searchReservableInventoryItems("", shootId, actorUserId)],
  ])("rejects a client actor before %s exposes catalog data", async (_operation, invoke) => {
    mocks.select.mockReturnValueOnce(roleResult("client"));

    await expect(invoke()).rejects.toThrow("não autorizado");
  });
});
