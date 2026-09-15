// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), select: vi.fn(), execute: vi.fn(), insert: vi.fn(), update: vi.fn(), audit: vi.fn() }));
vi.mock("@/db/client", () => ({ db: mocks }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.audit }));

import { inventoryItems, inventoryReservations, profiles } from "@/db/schema";
import { createPublicClutchRentalReservation, decidePublicClutchRentalReservation, listPublicClutchUnavailableRanges } from "@/domain/inventory/public-rental-reservation";
import { publicClutchRentalRequestSchema } from "@/domain/inventory/public-rental-reservation-schema";
import { inventoryReservationBlockingPredicate } from "@/domain/inventory/reservations";

const now = new Date("2030-05-01T12:34:56.789Z");
const inventoryItemId = "a0b1c2d3-e4f5-4000-8000-000000000001";
const reservationId = "00000000-0000-4000-8000-000000000002";
const actorUserId = "00000000-0000-4000-8000-000000000003";
const input = { slug: "clutch-dourada", startsOn: "2030-05-10", endsOn: "2030-05-12", guestName: " Ana Silva ", guestPhone: "(92) 99999-0000", guestEmail: "ana@example.com" };
const pending = { id: reservationId, inventoryItemId, shootId: null, purpose: "rental", status: "pending", startsOn: input.startsOn, endsOn: input.endsOn, expiresAt: new Date(now.getTime() + 86400000), guestName: "Ana Silva", guestPhone: "92999990000" };
type Query = { table: unknown; fields: unknown; condition?: SQL; lock?: string };
let queries: Query[];
let itemRows: unknown[][];
let reservationRows: unknown[][];
let actorRows: unknown[];
let written: Record<string, unknown>;
let decisionRow: Record<string, unknown>;
const dialect = new PgDialect();
const compile = (condition: SQL) => dialect.sqlToQuery(condition);

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  queries = [];
  itemRows = [[{ id: inventoryItemId }], [{ id: inventoryItemId }]];
  reservationRows = [[{ count: 0 }], []];
  actorRows = [{ role: "staff" }];
  written = {};
  decisionRow = { ...pending };
  mocks.transaction.mockImplementation(async (operation) => operation(mocks));
  mocks.select.mockImplementation((fields) => ({ from(table: unknown) {
    const query: Query = { table, fields };
    queries.push(query);
    let result: unknown[] | undefined;
    const rows = () => result ??= table === profiles ? actorRows : table === inventoryItems ? itemRows.shift() ?? [] : reservationRows.shift() ?? [];
    const chain = {
      innerJoin: () => chain,
      where: (condition: SQL) => { query.condition = condition; return chain; },
      limit: () => chain,
      orderBy: () => chain,
      for: (lock: string) => { query.lock = lock; return chain; },
      then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows()).then(resolve),
    };
    return chain;
  } }));
  mocks.insert.mockReturnValue({ values: (values: Record<string, unknown>) => {
    written = values;
    return { returning: async () => [{ id: reservationId, ...values, storagePath: "private/acervo.jpg" }] };
  } });
  mocks.update.mockReturnValue({ set: (values: Record<string, unknown>) => {
    written = values;
    return { where: (condition: SQL) => { queries.push({ table: inventoryReservations, fields: "update", condition }); return { returning: async () => [{ ...decisionRow, ...values }] }; } };
  } });
});
afterEach(() => vi.useRealTimers());

describe("public rental requests", () => {
  it("creates a published rental with normalized contact, exactly 24h expiry and only a public receipt", async () => {
    const result = await createPublicClutchRentalReservation(input);
    expect(result).toEqual({ reservationCode: reservationId, status: "pending", expiresAt: "2030-05-02T12:34:56.789Z" });
    expect(written).toMatchObject({ inventoryItemId, shootId: null, purpose: "rental", status: "pending", guestName: "Ana Silva", guestPhone: "92999990000", guestEmail: "ana@example.com", expiresAt: new Date(now.getTime() + 86400000) });
    expect(JSON.stringify(result)).not.toContain(inventoryItemId);
    expect(JSON.stringify(result)).not.toMatch(/private|Ana|99999|example/);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: null, action: "inventory_reservation.created", entityId: reservationId }), mocks);
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain("ana@example.com");
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });

  it("resolves and revalidates all publication invariants under an item row lock", async () => {
    await createPublicClutchRentalReservation(input);
    const items = queries.filter((query) => query.table === inventoryItems);
    expect(items).toHaveLength(2);
    expect(items[1].lock).toBe("update");
    for (const query of items) {
      const condition = compile(query.condition!);
      expect(condition.params).toEqual(expect.arrayContaining(["clutch", true, "available", "ready", input.slug]));
      for (const field of ["paixao_clutch_eligible", "paixao_clutch_published", "rental_price", "paixao_clutch_copy", "paixao_clutch_public_image_path"]) expect(condition.sql).toContain(field);
      expect(condition.sql).toContain('"inventory_public_media"."public_path" = "inventory_items"."paixao_clutch_public_image_path"');
    }
    const locks = mocks.execute.mock.calls.map(([statement]) => compile(statement));
    expect(locks).toEqual(expect.arrayContaining([expect.objectContaining({ sql: expect.stringContaining("pg_advisory_xact_lock"), params: [inventoryItemId] })]));
    expect(mocks.execute.mock.invocationCallOrder.at(-1)).toBeLessThan(mocks.insert.mock.invocationCallOrder[0]);
  });

  it.each(["initial", "revalidation"])("rejects an unpublished item during %s resolution", async (phase) => {
    itemRows = phase === "initial" ? [[]] : [[{ id: inventoryItemId }], []];
    await expect(createPublicClutchRentalReservation(input)).rejects.toThrow("indisponível");
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each(["pending", "confirmed"])("rejects inclusive overlap with an active %s reservation", async (status) => {
    reservationRows = [[{ count: 0 }], [{ id: reservationId, status }]];
    await expect(createPublicClutchRentalReservation(input)).rejects.toThrow("conflito de reserva");
    const condition = compile(queries.filter((query) => query.table === inventoryReservations).at(-1)!.condition!);
    expect(condition.sql).toMatch(/"starts_on" <=/);
    expect(condition.sql).toMatch(/"ends_on" >=/);
    expect(condition.params).toEqual(expect.arrayContaining([input.endsOn, input.startsOn]));
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("uses strict pending expiry, preserves internal pending and keeps confirmed blocking independently of expiry", () => {
    const condition = compile(inventoryReservationBlockingPredicate(now));
    expect(condition.sql).toMatch(/"status" = \$1 or \("inventory_reservations"\."status" = \$2 and/);
    expect(condition.sql).toContain('"shoot_id" is not null');
    expect(condition.sql).toMatch(/"expires_at" > \$3/);
    expect(condition.params).toEqual(["confirmed", "pending", now.toISOString()]);
  });

  it("accepts when expired pending has been excluded by the blocking predicate", async () => {
    await expect(createPublicClutchRentalReservation(input)).resolves.toMatchObject({ status: "pending" });
    const query = compile(queries.filter((query) => query.table === inventoryReservations).at(-1)!.condition!);
    expect(query.sql).toContain('"expires_at" >');
    expect(query.params).toContain(now.toISOString());
  });

  it("counts all requests across items in the rolling hour and rejects a fourth normalized phone request", async () => {
    reservationRows = [[{ count: 3 }]];
    await expect(createPublicClutchRentalReservation(input)).rejects.toThrow("limite");
    const query = compile(queries.find((query) => query.table === inventoryReservations)!.condition!);
    expect(query.sql).toContain('"guest_phone" =');
    expect(query.sql).toContain('"created_at" >');
    expect(query.sql).not.toContain('"inventory_item_id"');
    expect(query.params).toContain("92999990000");
    expect(query.params).toContain("2030-05-01T11:34:56.789Z");
    expect(mocks.insert).not.toHaveBeenCalled();
    const locks = mocks.execute.mock.calls.map(([statement]) => compile(statement));
    expect(locks[0].params).toEqual(["public-rental-phone:92999990000"]);
    expect(mocks.execute.mock.invocationCallOrder[0]).toBeLessThan(mocks.select.mock.invocationCallOrder[0]);
  });

  it("allows the third request with the same phone in another format", async () => {
    reservationRows = [[{ count: 2 }], []];
    await expect(createPublicClutchRentalReservation({ ...input, guestPhone: "92 99999 0000", guestEmail: "" })).resolves.toMatchObject({ status: "pending" });
    expect(written.guestPhone).toBe("92999990000");
    expect(written.guestEmail).toBeNull();
  });

  it.each([{ slug: "" }, { guestName: "A" }, { guestPhone: "12" }, { guestEmail: "invalid" }, { startsOn: "2030-02-30" }, { endsOn: "2030-05-09" }])("rejects malformed input before opening a transaction: %j", async (invalid) => {
    expect(publicClutchRentalRequestSchema.safeParse({ ...input, ...invalid }).success).toBe(false);
    await expect(createPublicClutchRentalReservation({ ...input, ...invalid })).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects contact with no usable phone digits", async () => {
    await expect(createPublicClutchRentalReservation({ ...input, guestPhone: "abcdefgh" })).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rolls back on audit failure by propagating the failure from the transaction", async () => {
    mocks.audit.mockRejectedValue(new Error("audit unavailable"));
    await expect(createPublicClutchRentalReservation(input)).rejects.toThrow("audit unavailable");
  });
});

describe("public unavailable ranges", () => {
  it("returns only date ranges through published item resolution and the expiry predicate", async () => {
    reservationRows = [[{ startsOn: input.startsOn, endsOn: input.endsOn }]];
    expect(await listPublicClutchUnavailableRanges(input.slug)).toEqual([{ startsOn: input.startsOn, endsOn: input.endsOn }]);
    const query = queries.find((query) => query.table === inventoryReservations)!;
    expect(Object.keys(query.fields!)).toEqual(["startsOn", "endsOn"]);
    expect(compile(query.condition!).sql).toContain('"expires_at" >');
  });

  it("does not disclose private item availability", async () => {
    itemRows = [[]];
    expect(await listPublicClutchUnavailableRanges("private")).toEqual([]);
    expect(queries.some((query) => query.table === inventoryReservations)).toBe(false);
  });
});

describe("staff public rental decisions", () => {
  beforeEach(() => { reservationRows = [[pending], [pending], []]; });

  it.each(["staff", "admin"])("allows %s approval and audits within the locked transaction", async (role) => {
    actorRows = [{ role }];
    expect(await decidePublicClutchRentalReservation({ reservationId, decision: "approve" }, actorUserId)).toMatchObject({ status: "confirmed", expiresAt: null });
    expect(mocks.execute).toHaveBeenCalled();
    expect(queries.some((query) => query.table === inventoryReservations && query.lock === "update")).toBe(true);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ actorUserId, action: "inventory_reservation.confirmed", entityId: reservationId }), mocks);
  });

  it("releases with cancellation metadata and audit", async () => {
    expect(await decidePublicClutchRentalReservation({ reservationId, decision: "release" }, actorUserId)).toMatchObject({ status: "released", cancelledByUserId: actorUserId, cancelledAt: now });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "inventory_reservation.released", actorUserId }), mocks);
  });

  it.each(["client", undefined])("rejects %s actor before any mutation", async (role) => {
    actorRows = role ? [{ role }] : [];
    await expect(decidePublicClutchRentalReservation({ reservationId, decision: "approve" }, actorUserId)).rejects.toThrow("não autorizado");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    { status: "confirmed" }, { status: "released" }, { purpose: "shoot", shootId: actorUserId }, { shootId: actorUserId }, { expiresAt: now }, { expiresAt: null },
  ])("refuses invalid or expired approval: %j", async (change) => {
    const row = { ...pending, ...change };
    reservationRows = [[row], [row], []];
    await expect(decidePublicClutchRentalReservation({ reservationId, decision: "approve" }, actorUserId)).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("rechecks overlapping reservations before approval", async () => {
    reservationRows = [[pending], [pending], [{ id: "other" }]];
    await expect(decidePublicClutchRentalReservation({ reservationId, decision: "approve" }, actorUserId)).rejects.toThrow("conflito de reserva");
    expect(mocks.update).not.toHaveBeenCalled();
    const conflict = compile(queries.filter((query) => query.table === inventoryReservations).at(-1)!.condition!);
    expect(conflict.sql).toMatch(/"id" <>/);
    expect(conflict.params).toContain(reservationId);
  });

  it("allows release of a confirmed reservation", async () => {
    const row = { ...pending, status: "confirmed", expiresAt: null };
    reservationRows = [[row], [row]];
    expect(await decidePublicClutchRentalReservation({ reservationId, decision: "release" }, actorUserId)).toMatchObject({ status: "released" });
  });
});
