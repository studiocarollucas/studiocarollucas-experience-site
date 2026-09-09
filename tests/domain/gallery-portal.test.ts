// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSignedUrls: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: { select: mocks.select },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ storage: { from: mocks.from } })),
}));

import { readClientGallery, readClientGalleryReveal } from "@/domain/gallery/portal";

const context = {
  client: { id: "client-owner", name: "Mariana" },
  viewerAuthUserId: "auth-owner",
  shoot: null,
};

describe("readClientGallery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns no assets for a draft gallery", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ limit }));
    const innerJoin = vi.fn(() => ({ where }));
    mocks.from.mockReturnValue({ innerJoin });
    mocks.select.mockReturnValue({ from: mocks.from });

    await expect(readClientGallery(context)).resolves.toBeNull();
    expect(mocks.from).toHaveBeenCalledOnce();
    expect(mocks.createSignedUrls).not.toHaveBeenCalled();
  });

  it("creates signed URLs only for the portal owner's published gallery", async () => {
    const gallery = {
      id: "gallery-1",
      shootId: "shoot-owner",
      status: "published",
      createdAt: new Date("2026-09-09T12:00:00Z"),
    };
    const assets = [
      {
        id: "asset-1",
        galleryId: gallery.id,
        storagePath: "gallery-assets/gallery-1/asset-1.jpg",
        sortOrder: 0,
        createdAt: new Date("2026-09-09T12:00:00Z"),
      },
    ];
    const galleryLimit = vi.fn().mockResolvedValue([{ galleries: gallery }]);
    const galleryWhere = vi.fn(() => ({ limit: galleryLimit }));
    const innerJoin = vi.fn(() => ({ where: galleryWhere }));
    const assetOrderBy = vi.fn().mockResolvedValue(assets);
    const assetWhere = vi.fn(() => ({ orderBy: assetOrderBy }));
    mocks.from
      .mockReturnValueOnce({ innerJoin })
      .mockReturnValueOnce({ where: assetWhere });
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.createSignedUrls.mockResolvedValue({
      data: [
        {
          path: assets[0].storagePath,
          error: null,
          signedUrl: "https://private.example.test/asset-1?signed=1",
        },
      ],
      error: null,
    });
    mocks.from.mockReturnValue({ createSignedUrls: mocks.createSignedUrls });

    await expect(readClientGallery(context)).resolves.toMatchObject({
      ...gallery,
      assets: [
        {
          ...assets[0],
          signedUrl: "https://private.example.test/asset-1?signed=1",
        },
      ],
    });
    expect(galleryWhere).toHaveBeenCalledOnce();
    expect(mocks.createSignedUrls).toHaveBeenCalledWith([assets[0].storagePath], 60 * 10);
  });
});

describe("readClientGalleryReveal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns a signed cover for the portal owner's published gallery", async () => {
    const gallery = {
      id: "gallery-1",
      shootId: "shoot-owner",
      status: "published",
      createdAt: new Date("2026-09-09T12:00:00Z"),
    };
    const assets = [
      {
        id: "asset-1",
        galleryId: gallery.id,
        storagePath: "gallery-assets/gallery-1/asset-1.jpg",
        sortOrder: 0,
        createdAt: new Date("2026-09-09T12:00:00Z"),
      },
    ];
    const galleryLimit = vi.fn().mockResolvedValue([{ galleries: gallery }]);
    const galleryWhere = vi.fn(() => ({ limit: galleryLimit }));
    const innerJoin = vi.fn(() => ({ where: galleryWhere }));
    const assetOrderBy = vi.fn().mockResolvedValue(assets);
    const assetWhere = vi.fn(() => ({ orderBy: assetOrderBy }));
    mocks.from
      .mockReturnValueOnce({ innerJoin })
      .mockReturnValueOnce({ where: assetWhere })
      .mockReturnValueOnce({ createSignedUrls: mocks.createSignedUrls });
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.createSignedUrls.mockResolvedValue({
      data: [{ path: assets[0].storagePath, error: null, signedUrl: "https://private.example.test/asset-1?signed=1" }],
      error: null,
    });

    await expect(readClientGalleryReveal(context)).resolves.toEqual({
      id: "gallery-1",
      title: "Suas fotos estão prontas",
      message: expect.any(String),
      cover: { alt: "Capa da sua galeria", signedUrl: expect.stringContaining("signed=1") },
    });
    expect(mocks.createSignedUrls).toHaveBeenCalledWith([assets[0].storagePath], 60 * 10);
  });

  it("returns null for the portal owner's draft gallery", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ limit }));
    const innerJoin = vi.fn(() => ({ where }));
    mocks.from.mockReturnValue({ innerJoin });
    mocks.select.mockReturnValue({ from: mocks.from });

    await expect(readClientGalleryReveal(context)).resolves.toBeNull();
    expect(mocks.createSignedUrls).not.toHaveBeenCalled();
  });

  it("returns null when the portal owner's published gallery has no assets", async () => {
    const gallery = {
      id: "gallery-1",
      shootId: "shoot-owner",
      status: "published",
      createdAt: new Date("2026-09-09T12:00:00Z"),
    };
    const galleryLimit = vi.fn().mockResolvedValue([{ galleries: gallery }]);
    const galleryWhere = vi.fn(() => ({ limit: galleryLimit }));
    const innerJoin = vi.fn(() => ({ where: galleryWhere }));
    const assetOrderBy = vi.fn().mockResolvedValue([]);
    const assetWhere = vi.fn(() => ({ orderBy: assetOrderBy }));
    mocks.from
      .mockReturnValueOnce({ innerJoin })
      .mockReturnValueOnce({ where: assetWhere });
    mocks.select.mockReturnValue({ from: mocks.from });

    await expect(readClientGalleryReveal(context)).resolves.toBeNull();
    expect(mocks.createSignedUrls).not.toHaveBeenCalled();
  });
});
