import { describe, expect, it } from "vitest";
import { galleryAssetPath, galleryDownloadFileName } from "@/domain/gallery/storage";

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

describe("galleryDownloadFileName", () => {
  it("offers a neutral file name without the storage path or gallery id", () => {
    const assetId = "3f2a9c1e-0000-4000-8000-000000000001";
    const name = galleryDownloadFileName(assetId, `gallery-assets/gallery-1/${assetId}.webp`);

    expect(name).toBe("studio-carol-lucas-3f2a9c1e.webp");
    expect(name).not.toContain("gallery-1");
    expect(name).not.toContain("/");
  });

  it("falls back to jpg for an unexpected extension", () => {
    expect(galleryDownloadFileName("asset-1", "gallery-assets/g/asset-1")).toBe("studio-carol-lucas-asset1.jpg");
  });
});
