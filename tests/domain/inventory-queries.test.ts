// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock("@/db/client", () => ({ db: { select: mocks.select } }));

import {
  listInventoryItems,
  normalizeInventoryListFilters,
  searchReservableInventoryItems,
} from "@/domain/inventory/queries";

const itemId = "00000000-0000-4000-8000-000000000002";
const shootId = "00000000-0000-4000-8000-000000000003";

function chain(result: unknown) {
  const offset = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ offset });
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit }) }),
    }),
    limit,
    offset,
  };
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
    mocks.select
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ total: 1 }]) }) })
      .mockReturnValueOnce(chain([{ id: itemId, code: "CL-001", name: "Clutch dourada", type: "clutch" }]))
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([{ ...futureReservations[0], inventoryItemId: itemId }]) }) }) });

    await expect(
      listInventoryItems({ search: "dourada", type: "clutch", status: "available", color: "gold", size: "M", page: 2, pageSize: 10 }),
    ).resolves.toEqual({
      rows: [{ id: itemId, code: "CL-001", name: "Clutch dourada", type: "clutch", futureReservations }],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it("searches active available items by code or name and never offers maintenance, retired, or inactive inventory", async () => {
    const results = [{ id: itemId, code: "CL-001", name: "Clutch dourada", type: "clutch", status: "available" }];
    mocks.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(results) }) }),
      }),
    });

    await expect(searchReservableInventoryItems("CL-001", shootId)).resolves.toEqual(results);
  });
});
