import { describe, expect, it } from "vitest";
import { galleryAssetPath } from "@/domain/gallery/storage";

describe("galleryAssetPath", () => {
  it.each(["jpg", "jpeg", "png", "webp"])("creates a private path for .%s", (extension) => {
    expect(galleryAssetPath("gallery-1", "asset-1", extension)).toBe(
      `gallery-assets/gallery-1/asset-1.${extension}`,
    );
  });

  it("rejects unsafe file extensions", () => {
    expect(() => galleryAssetPath("gallery-1", "asset-1", "../pdf")).toThrow();
  });
});
