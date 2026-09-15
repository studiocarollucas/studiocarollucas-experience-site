import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0048_public_clutch_rental_reservations.sql");
const snapshotPath = path.resolve("db/migrations/meta/0048_snapshot.json");
const journalPath = path.resolve("db/migrations/meta/_journal.json");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
const normalizedSql = sql.toLowerCase().replace(/\s+/g, " ");

describe("public clutch rental reservations migration", () => {
  it("allows public rentals while preserving internal shoot and rental reservations", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(normalizedSql).toContain('alter table "inventory_reservations" alter column "shoot_id" drop not null');
    expect(normalizedSql).toContain('add column "guest_name" text');
    expect(normalizedSql).toContain('add column "guest_phone" text');
    expect(normalizedSql).toContain('add column "guest_email" text');
    expect(normalizedSql).toContain('add column "expires_at" timestamp with time zone');
    expect(normalizedSql).toContain('"inventory_reservations"."purpose" = \'shoot\' and "inventory_reservations"."shoot_id" is not null and "inventory_reservations"."guest_name" is null and "inventory_reservations"."guest_phone" is null');
    expect(normalizedSql).toContain('"inventory_reservations"."purpose" = \'rental\' and ( ("inventory_reservations"."shoot_id" is not null and "inventory_reservations"."guest_name" is null and "inventory_reservations"."guest_phone" is null) or ("inventory_reservations"."shoot_id" is null and "inventory_reservations"."guest_name" is not null and "inventory_reservations"."guest_phone" is not null) )');
    expect(normalizedSql).toContain('"inventory_reservations"."purpose" = \'rental\' or "inventory_reservations"."expires_at" is null');
  });

  it("records the new nullable columns and checks in the generated snapshot and journal", () => {
    expect(fs.existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
    const reservation = snapshot.tables["public.inventory_reservations"];

    expect(reservation.columns.shoot_id.notNull).toBe(false);
    expect(reservation.columns.guest_name).toMatchObject({ type: "text", notNull: false });
    expect(reservation.columns.guest_phone).toMatchObject({ type: "text", notNull: false });
    expect(reservation.columns.guest_email).toMatchObject({ type: "text", notNull: false });
    expect(reservation.columns.expires_at).toMatchObject({ type: "timestamp with time zone", notNull: false });
    expect(reservation.checkConstraints.inventory_reservations_reservation_contact_valid).toBeDefined();
    expect(reservation.checkConstraints.inventory_reservations_expires_at_rental_only).toBeDefined();
    expect(journal.entries).toContainEqual(expect.objectContaining({ idx: 48, tag: "0048_public_clutch_rental_reservations" }));
  });
});
