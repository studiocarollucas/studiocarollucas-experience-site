import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { profiles } from "@/db/schema";

describe("profiles schema", () => {
  it("has the expected columns", () => {
    const columns = Object.keys(getTableColumns(profiles));
    expect(columns).toEqual(
      expect.arrayContaining(["id", "role", "fullName", "email", "createdAt"])
    );
  });
});
