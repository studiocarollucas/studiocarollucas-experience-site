import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.resolve("db/migrations/0038_inventory_foundation.sql"),
  "utf8",
);

describe("inventory foundation migration", () => {
  it("restricts both inventory enum types to authenticated and service roles", () => {
    for (const enumName of ["inventory_item_type", "inventory_item_status"]) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on type public\\.${enumName} from public, anon, authenticated;`,
          "i",
        ),
      );
      expect(sql).toMatch(
        new RegExp(
          `grant usage on type public\\.${enumName} to authenticated, service_role;`,
          "i",
        ),
      );
    }
  });
});
