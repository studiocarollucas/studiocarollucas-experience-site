import { describe, expect, it } from "vitest";
import { toPaixaoClutchCatalogItem } from "@/lib/site/paixao-clutch-catalog";

describe("toPaixaoClutchCatalogItem", () => {
  it("strips server-only projection metadata before catalog data crosses the client boundary", () => {
    const item = toPaixaoClutchCatalogItem({
      id: "internal-id",
      slug: "clutch-dourada",
      name: "Clutch dourada",
      copy: "Copy editorial.",
      rentalPrice: "120.00",
      publicImagePath: "/api/public/inventory-media/dourada.webp",
      featured: true,
      sortOrder: 7,
      color: "Dourado",
      size: "Média",
      description: "Acabamento metalizado.",
    });

    expect(item).toEqual({
      slug: "clutch-dourada",
      name: "Clutch dourada",
      rentalPrice: "120.00",
      publicImagePath: "/api/public/inventory-media/dourada.webp",
      color: "Dourado",
      size: "Média",
      description: "Acabamento metalizado.",
    });
    expect(item).not.toHaveProperty("id");
    expect(item).not.toHaveProperty("featured");
    expect(item).not.toHaveProperty("sortOrder");
    expect(item).not.toHaveProperty("copy");
  });
});
