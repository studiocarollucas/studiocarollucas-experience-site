// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { query: number; method: string; args: unknown[] };

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  txSelect: vi.fn(),
  execute: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  recordAuditEvent: vi.fn(),
  createClient: vi.fn(),
  createSignedUrls: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: { select: mocks.select, transaction: mocks.transaction },
}));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import {
  PortalInventorySelectionError,
  readPortalInventorySelection,
  setClientInventoryPreference,
} from "@/domain/inventory/portal-selection";

const CLIENT_ID = "00000000-0000-4000-8000-000000000001";
const SHOOT_ID = "00000000-0000-4000-8000-000000000002";
const AUTH_USER_ID = "00000000-0000-4000-8000-000000000003";
const ITEM_ID = "00000000-0000-4000-8000-000000000011";
const OTHER_ITEM_ID = "00000000-0000-4000-8000-000000000012";
const RESERVATION_ID = "00000000-0000-4000-8000-000000000021";
const SHOOT_DATE = "2099-05-10";

const actor = { clientId: CLIENT_ID, shootId: SHOOT_ID, authUserId: AUTH_USER_ID };
const openShoot = {
  id: SHOOT_ID,
  shootDate: SHOOT_DATE,
  status: "preparacao",
  portalEnabled: true,
  outfitsLimit: 2,
  clutchIncluded: true,
};

let calls: Call[] = [];
let queryCount = 0;

// Minimal Drizzle query-builder double: every chained method returns the same
// builder, and awaiting it resolves to the queued rows.
function query(result: unknown): unknown {
  const index = queryCount++;
  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject);
        }
        return (...args: unknown[]) => {
          calls.push({ query: index, method: String(prop), args });
          return builder;
        };
      },
    },
  );
  return builder;
}

function queue(fn: { mockImplementation: (impl: () => unknown) => unknown }, results: unknown[]) {
  const pending = [...results];
  fn.mockImplementation(() => query(pending.length ? pending.shift() : []));
}

function lockedQueries() {
  return calls.filter((call) => call.method === "for").map((call) => call.args[0]);
}

describe("setClientInventoryPreference", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    calls = [];
    queryCount = 0;
    mocks.transaction.mockImplementation(async (operation) =>
      operation({
        execute: mocks.execute,
        select: mocks.txSelect,
        insert: mocks.insert,
        update: mocks.update,
      }),
    );
    mocks.insert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((values) => query([{ id: RESERVATION_ID, ...values }])),
    }));
    mocks.update.mockImplementation(() => ({
      set: vi.fn().mockImplementation(() => query([{ id: RESERVATION_ID }])),
    }));
    mocks.recordAuditEvent.mockResolvedValue({ id: "audit-1" });
  });

  it("rejects malformed input before opening a transaction", async () => {
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: "not-a-uuid", preferred: true }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("records a pending preference for the shoot date under the item lock and audits the client", async () => {
    queue(mocks.txSelect, [[{ id: SHOOT_ID }], [openShoot], [], [{ type: "outfit", active: true, status: "available" }], [], []]);

    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: true, shootId: "other-shoot" }),
    ).resolves.toEqual({ inventoryItemId: ITEM_ID, state: "preferred" });

    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.execute.mock.invocationCallOrder[0]).toBeLessThan(mocks.txSelect.mock.invocationCallOrder[0]);
    expect(lockedQueries()).toEqual(["update", "update"]);
    const values = mocks.insert.mock.results[0]?.value.values;
    expect(values).toHaveBeenCalledWith({
      inventoryItemId: ITEM_ID,
      shootId: SHOOT_ID,
      purpose: "shoot",
      startsOn: SHOOT_DATE,
      endsOn: SHOOT_DATE,
      status: "pending",
    });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: AUTH_USER_ID,
        action: "inventory_reservation.preference_created",
        entityType: "inventory_reservation",
        entityId: RESERVATION_ID,
      }),
      expect.objectContaining({ insert: mocks.insert }),
    );
  });

  it("refuses a shoot that is not the client's or is closed for selection", async () => {
    queue(mocks.txSelect, [[]]);
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: true }),
    ).rejects.toMatchObject({ code: "not_open" });

    queue(mocks.txSelect, [[{ id: SHOOT_ID }], [{ ...openShoot, status: "realizado" }]]);
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: true }),
    ).rejects.toMatchObject({ code: "not_open" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it.each([
    [{ type: "outfit", active: false, status: "available" }],
    [{ type: "outfit", active: true, status: "maintenance" }],
    [{ type: "clutch", active: true, status: "retired" }],
    [{ type: "accessory", active: true, status: "available" }],
    [{ type: "prop", active: true, status: "available" }],
  ])("refuses an item outside the client's eligible catalog: %j", async (item) => {
    queue(mocks.txSelect, [[{ id: SHOOT_ID }], [openShoot], [], [item]]);
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: true }),
    ).rejects.toMatchObject({ code: "not_eligible" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("refuses a clutch when the package does not include one", async () => {
    queue(mocks.txSelect, [
      [{ id: SHOOT_ID }],
      [{ ...openShoot, clutchIncluded: false }],
      [],
      [{ type: "clutch", active: true, status: "available" }],
    ]);
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: true }),
    ).rejects.toMatchObject({ code: "not_eligible" });
  });

  it("enforces the package limit counting distinct linked items", async () => {
    queue(mocks.txSelect, [
      [{ id: SHOOT_ID }],
      [openShoot],
      [],
      [{ type: "outfit", active: true, status: "available" }],
      [
        { inventoryItemId: OTHER_ITEM_ID, type: "outfit", status: "confirmed" },
        { inventoryItemId: "00000000-0000-4000-8000-000000000013", type: "outfit", status: "pending" },
      ],
    ]);
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: true }),
    ).rejects.toMatchObject({ code: "limit_reached" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("does not count one item twice when the studio split its reservation", async () => {
    queue(mocks.txSelect, [
      [{ id: SHOOT_ID }],
      [openShoot],
      [],
      [{ type: "outfit", active: true, status: "available" }],
      [
        { inventoryItemId: OTHER_ITEM_ID, type: "outfit", status: "confirmed" },
        { inventoryItemId: OTHER_ITEM_ID, type: "outfit", status: "confirmed" },
      ],
      [],
    ]);
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: true }),
    ).resolves.toEqual({ inventoryItemId: ITEM_ID, state: "preferred" });
  });

  it("never promises an item with a blocking reservation on the shoot date", async () => {
    queue(mocks.txSelect, [
      [{ id: SHOOT_ID }],
      [openShoot],
      [],
      [{ type: "clutch", active: true, status: "available" }],
      [],
      [{ id: "someone-else" }],
    ]);
    const error = await setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: true }).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(PortalInventorySelectionError);
    expect(error).toMatchObject({ code: "unavailable", message: expect.stringMatching(/indisponível/) });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("is idempotent when the item is already linked to the shoot", async () => {
    queue(mocks.txSelect, [[{ id: SHOOT_ID }], [openShoot], [{ id: RESERVATION_ID, status: "pending" }]]);
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: true }),
    ).resolves.toEqual({ inventoryItemId: ITEM_ID, state: "preferred" });

    queue(mocks.txSelect, [[{ id: SHOOT_ID }], [openShoot], [{ id: RESERVATION_ID, status: "confirmed" }]]);
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: true }),
    ).resolves.toEqual({ inventoryItemId: ITEM_ID, state: "reserved" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("withdraws only the client's pending preference, keeping history and auditing", async () => {
    queue(mocks.txSelect, [[{ id: SHOOT_ID }], [openShoot], [{ id: RESERVATION_ID, status: "pending" }]]);

    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: false }),
    ).resolves.toEqual({ inventoryItemId: ITEM_ID, state: "available" });

    const set = mocks.update.mock.results[0]?.value.set;
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
        cancelledAt: expect.any(Date),
        cancelledByUserId: AUTH_USER_ID,
      }),
    );
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: AUTH_USER_ID,
        action: "inventory_reservation.preference_withdrawn",
        entityId: RESERVATION_ID,
      }),
      expect.anything(),
    );
  });

  it("never changes a studio confirmation from the portal", async () => {
    queue(mocks.txSelect, [[{ id: SHOOT_ID }], [openShoot], [{ id: RESERVATION_ID, status: "confirmed" }]]);
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: false }),
    ).rejects.toMatchObject({ code: "confirmed" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("treats withdrawing a missing preference as a no-op", async () => {
    queue(mocks.txSelect, [[{ id: SHOOT_ID }], [openShoot], []]);
    await expect(
      setClientInventoryPreference(actor, { inventoryItemId: ITEM_ID, preferred: false }),
    ).resolves.toEqual({ inventoryItemId: ITEM_ID, state: "available" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("readPortalInventorySelection", () => {
  const context = {
    client: { id: CLIENT_ID, name: "Mariana" },
    viewerAuthUserId: AUTH_USER_ID,
    shoot: { id: SHOOT_ID } as never,
  };
  const now = new Date("2099-05-01T12:00:00Z");

  beforeEach(() => {
    vi.resetAllMocks();
    calls = [];
    queryCount = 0;
    mocks.storageFrom.mockReturnValue({ createSignedUrls: mocks.createSignedUrls });
    mocks.createClient.mockReturnValue({ storage: { from: mocks.storageFrom } });
    mocks.createSignedUrls.mockImplementation(async (paths: string[]) => ({
      data: paths.map((path) => ({ path, signedUrl: `https://signed.example/${path}?token=t`, error: null })),
      error: null,
    }));
  });

  it("returns nothing without a selected shoot or when the shoot is not the client's", async () => {
    await expect(readPortalInventorySelection({ ...context, shoot: null }, now)).resolves.toBeNull();
    queue(mocks.select, [[]]);
    await expect(readPortalInventorySelection(context, now)).resolves.toBeNull();
  });

  it("projects only display fields with signed photos and marks availability without leaking other bookings", async () => {
    const media = Array.from({ length: 5 }, (_, index) => ({
      id: `media-${index}`,
      inventoryItemId: OTHER_ITEM_ID,
      storagePath: `inventory-media/${OTHER_ITEM_ID}/media-${index}.jpg`,
    }));
    queue(mocks.select, [
      [openShoot],
      [
        { inventoryItemId: ITEM_ID, status: "pending", name: "Vestido rosé", type: "outfit", color: "rosé", size: "M" },
        { inventoryItemId: ITEM_ID, status: "confirmed", name: "Vestido rosé", type: "outfit", color: "rosé", size: "M" },
      ],
      [
        { id: ITEM_ID, name: "Vestido rosé", type: "outfit", color: "rosé", size: "M" },
        { id: OTHER_ITEM_ID, name: "Clutch dourada", type: "clutch", color: "dourado", size: null },
        { id: "00000000-0000-4000-8000-000000000013", name: "Vestido azul", type: "outfit", color: null, size: "P" },
      ],
      [{ inventoryItemId: "00000000-0000-4000-8000-000000000013" }],
      media,
    ]);

    const selection = await readPortalInventorySelection(context, now);

    expect(selection).toMatchObject({
      selectionOpen: true,
      limits: { outfit: 2, clutch: 1 },
      used: { outfit: 1, clutch: 0 },
      shootItems: [{ id: ITEM_ID, availability: "reserved", photos: [] }],
      catalog: [
        { id: OTHER_ITEM_ID, availability: "available" },
        { id: "00000000-0000-4000-8000-000000000013", availability: "unavailable" },
      ],
    });
    // Catalog projection never selects code, internal description, prices or Paixão fields.
    expect(Object.keys(mocks.select.mock.calls[2]?.[0] ?? {})).toEqual(["id", "name", "type", "color", "size"]);
    const clutch = selection?.catalog[0];
    expect(clutch?.photos).toHaveLength(4);
    expect(clutch?.photos[0]).toEqual({ id: "media-0", signedUrl: expect.stringContaining("token=") });
    expect(Object.keys(clutch ?? {}).sort()).toEqual(["availability", "color", "id", "name", "photos", "size", "type"]);
    expect(JSON.stringify(selection)).not.toMatch(/"storagePath"|"code"|internalPrice|rentalPrice/);
    expect(mocks.storageFrom).toHaveBeenCalledWith("inventory-media");
    expect(mocks.createSignedUrls).toHaveBeenCalledWith(media.slice(0, 4).map((row) => row.storagePath), 600);
  });

  it("shows only the shoot's own items once selection is closed", async () => {
    queue(mocks.select, [
      [{ ...openShoot, status: "realizado" }],
      [{ inventoryItemId: ITEM_ID, status: "confirmed", name: "Vestido rosé", type: "outfit", color: null, size: null }],
      [],
    ]);

    const selection = await readPortalInventorySelection(context, now);

    expect(selection).toMatchObject({ selectionOpen: false, catalog: [], shootItems: [{ id: ITEM_ID }] });
    expect(mocks.select).toHaveBeenCalledTimes(3);
  });

  it("fails closed when the storage signs a different number of photos", async () => {
    queue(mocks.select, [
      [openShoot],
      [{ inventoryItemId: ITEM_ID, status: "pending", name: "Vestido", type: "outfit", color: null, size: null }],
      [],
      [{ id: "media-1", inventoryItemId: ITEM_ID, storagePath: "inventory-media/a/b.jpg" }],
    ]);
    mocks.createSignedUrls.mockResolvedValueOnce({ data: [], error: null });

    await expect(readPortalInventorySelection(context, now)).rejects.toThrow("media URLs unavailable");
  });
});
