import { beforeEach, describe, expect, it, vi } from "vitest";

const shootId = "00000000-0000-4000-8000-000000000001";
const galleryId = "00000000-0000-4000-8000-000000000002";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getGalleryForShoot: vi.fn(),
  publishGallery: vi.fn(),
  removeGalleryAsset: vi.fn(),
  reorderGalleryAssets: vi.fn(),
  uploadGalleryAsset: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/gallery/service", () => ({ getGalleryForShoot: mocks.getGalleryForShoot }));
vi.mock("@/domain/gallery/assets", () => ({
  publishGallery: mocks.publishGallery,
  removeGalleryAsset: mocks.removeGalleryAsset,
  reorderGalleryAssets: mocks.reorderGalleryAssets,
  uploadGalleryAsset: mocks.uploadGalleryAsset,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import GalleryPage from "@/app/admin/(protected)/galerias/[shootId]/page";
import { publishGalleryAction } from "@/app/admin/(protected)/galerias/[shootId]/actions";

describe("GalleryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-user", role: "staff" });
  });

  it("blocks client roles before loading a gallery", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "client-user", role: "client" });

    await expect(GalleryPage({ params: Promise.resolve({ shootId }) })).rejects.toThrow("Acesso negado");
    expect(mocks.getGalleryForShoot).not.toHaveBeenCalled();
  });

  it("publishes through a staff action and revalidates the gallery route", async () => {
    await expect(publishGalleryAction({ galleryId, shootId })).resolves.toEqual({ ok: true, data: { id: galleryId } });

    expect(mocks.publishGallery).toHaveBeenCalledWith(galleryId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/galerias/${shootId}`);
  });
});
