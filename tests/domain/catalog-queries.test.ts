import { describe, expect, it } from "vitest";
import { sortPackageOptions } from "@/domain/catalog/queries";

describe("sortPackageOptions", () => {
  it("orders package options by family and package order", () => {
    const sorted = sortPackageOptions([
      { familySortOrder: 2, packageSortOrder: 1, name: "Gestante 1" },
      { familySortOrder: 1, packageSortOrder: 2, name: "Debutante 2" },
      { familySortOrder: 1, packageSortOrder: 1, name: "Debutante 1" },
    ]);

    expect(sorted.map((item) => item.name)).toEqual([
      "Debutante 1",
      "Debutante 2",
      "Gestante 1",
    ]);
  });
});
