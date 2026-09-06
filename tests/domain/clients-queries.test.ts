import { describe, it, expect } from "vitest";
import { normalizeListParams } from "@/domain/clients/queries";

describe("normalizeListParams", () => {
  it("defaults page to 1 and pageSize to 25", () => {
    expect(normalizeListParams({})).toEqual({ search: undefined, page: 1, pageSize: 25 });
  });

  it("parses string page/pageSize from query params", () => {
    expect(normalizeListParams({ page: "3", pageSize: "50" })).toEqual({
      search: undefined,
      page: 3,
      pageSize: 50,
    });
  });

  it("clamps page to >= 1 and pageSize to 1..100", () => {
    expect(normalizeListParams({ page: "0", pageSize: "999" }).page).toBe(1);
    expect(normalizeListParams({ page: "-2", pageSize: "999" }).pageSize).toBe(100);
    expect(normalizeListParams({ pageSize: "0" }).pageSize).toBe(25);
  });

  it("trims search and treats empty/whitespace as undefined", () => {
    expect(normalizeListParams({ search: "  maria  " }).search).toBe("maria");
    expect(normalizeListParams({ search: "   " }).search).toBeUndefined();
  });
});
