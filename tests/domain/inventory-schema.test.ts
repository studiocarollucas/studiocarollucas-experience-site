import { describe, expect, it } from "vitest";
import {
  createInventoryItemSchema,
  inventoryItemStatusValues,
  inventoryItemTypeValues,
} from "@/domain/inventory/schema";
import {
  inventoryReservationPurposeValues,
  inventoryReservations,
  inventoryReservationStatusValues,
} from "@/db/schema/inventory";

describe("createInventoryItemSchema", () => {
  it("exports the four initial item types and validates a physical item", () => {
    expect(inventoryItemTypeValues).toEqual([
      "outfit",
      "clutch",
      "accessory",
      "prop",
    ]);
    expect(inventoryItemStatusValues).toEqual([
      "available",
      "maintenance",
      "retired",
    ]);
    expect(
      createInventoryItemSchema.safeParse({
        code: "CL-001",
        name: "Clutch dourada",
        type: "clutch",
        status: "available",
      }).success,
    ).toBe(true);
  });

  it("rejects an empty code, unknown type and invalid internal price", () => {
    expect(
      createInventoryItemSchema.safeParse({
        code: "",
        name: "x",
        type: "clutch",
        status: "available",
      }).success,
    ).toBe(false);
    expect(
      createInventoryItemSchema.safeParse({
        code: "X",
        name: "x",
        type: "shoe",
        status: "available",
      }).success,
    ).toBe(false);
    expect(
      createInventoryItemSchema.safeParse({
        code: "X",
        name: "x",
        type: "clutch",
        status: "available",
        internalPrice: "bad",
      }).success,
    ).toBe(false);
  });
});

describe("inventory reservations schema", () => {
  it("exports reservation purposes, statuses, and the auditable reservation fields", () => {
    expect(inventoryReservationPurposeValues).toEqual(["shoot", "rental"]);
    expect(inventoryReservationStatusValues).toEqual([
      "pending",
      "confirmed",
      "cancelled",
      "released",
    ]);
    expect(Object.keys(inventoryReservations)).toEqual(expect.arrayContaining([
      "inventoryItemId",
      "shootId",
      "purpose",
      "startsOn",
      "endsOn",
      "status",
      "cancelledAt",
      "cancelledByUserId",
      "overrideReason",
      "overriddenByUserId",
      "overriddenAt",
    ]));
  });
});
