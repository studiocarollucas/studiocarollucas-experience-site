import { describe, it, expect } from "vitest";
import { normalizeShootFilters } from "@/domain/shoots/queries";

describe("normalizeShootFilters", () => {
  it("defaults page 1, pageSize 25, everything else undefined", () => {
    expect(normalizeShootFilters({})).toEqual({
      search: undefined,
      status: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      pageSize: 25,
    });
  });

  it("keeps only a status that is a real shoot_status value", () => {
    expect(normalizeShootFilters({ status: "edicao" }).status).toBe("edicao");
    expect(normalizeShootFilters({ status: "bogus" }).status).toBeUndefined();
  });

  it("keeps only ISO date strings for from/to", () => {
    expect(normalizeShootFilters({ from: "2026-01-01", to: "2026-12-31" })).toMatchObject({
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(normalizeShootFilters({ from: "01/01/2026" }).from).toBeUndefined();
  });

  it("trims search and clamps page", () => {
    expect(normalizeShootFilters({ search: "  ana ", page: "0" })).toMatchObject({ search: "ana", page: 1 });
  });
});
