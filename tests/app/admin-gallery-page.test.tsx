import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const shootId = "00000000-0000-4000-8000-000000000001";
const galleryId = "00000000-0000-4000-8000-000000000002";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getGalleryForShoot: vi.fn(),
  getGallerySelectionSummary: vi.fn(),
  setGalleryDownloadsEnabled: vi.fn(),
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
vi.mock("@/domain/gallery/selections", () => ({ getGallerySelectionSummary: mocks.getGallerySelectionSummary }));
vi.mock("@/domain/gallery/downloads", () => ({ setGalleryDownloadsEnabled: mocks.setGalleryDownloadsEnabled }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import GalleryPage from "@/app/admin/(protected)/galerias/[shootId]/page";
import { publishGalleryAction, setGalleryDownloadsAction } from "@/app/admin/(protected)/galerias/[shootId]/actions";

describe("GalleryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-user", role: "staff" });
  });

  it("blocks client roles before loading a gallery", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "client-user", role: "client" });

    await expect(GalleryPage({ params: Promise.resolve({ shootId }) })).rejects.toThrow("Acesso negado");
    expect(mocks.getGalleryForShoot).not.toHaveBeenCalled();
    expect(mocks.getGallerySelectionSummary).not.toHaveBeenCalled();
  });

  it("shows favorite counts per gallery and per photo and the download switch", async () => {
    const assetId = "00000000-0000-4000-8000-000000000003";
    mocks.getGalleryForShoot.mockResolvedValue({
      id: galleryId,
      shootId,
      status: "published",
      downloadsEnabled: false,
      createdAt: new Date("2026-09-25T12:00:00Z"),
      assets: [
        {
          id: assetId,
          galleryId,
          storagePath: `gallery-assets/${galleryId}/${assetId}.jpg`,
          sortOrder: 0,
          createdAt: new Date("2026-09-25T12:00:00Z"),
        },
      ],
    });
    mocks.getGallerySelectionSummary.mockResolvedValue({ totalSelections: 1, byAssetId: { [assetId]: 1 } });

    render(await GalleryPage({ params: Promise.resolve({ shootId }) }));

    expect(mocks.getGallerySelectionSummary).toHaveBeenCalledWith(galleryId);
    expect(screen.getByText("Favoritos da cliente: 1 favorito")).toBeInTheDocument();
    expect(screen.getByText("· 1 favorito")).toBeInTheDocument();
    expect(screen.getByText(/Downloads bloqueados/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Liberar downloads" })).toBeInTheDocument();
  });

  it("toggles downloads through an audited staff action", async () => {
    mocks.setGalleryDownloadsEnabled.mockResolvedValue({ galleryId, downloadsEnabled: true, changed: true });
    const form = new FormData();
    form.set("galleryId", galleryId);
    form.set("shootId", shootId);
    form.set("downloadsEnabled", "true");

    await expect(setGalleryDownloadsAction(form)).resolves.toEqual({
      ok: true,
      data: { id: galleryId, downloadsEnabled: true },
    });

    expect(mocks.setGalleryDownloadsEnabled).toHaveBeenCalledWith({
      galleryId,
      enabled: true,
      actorUserId: "staff-user",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/galerias/${shootId}`);
  });

  it("refuses the download switch to client roles", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "client-user", role: "client" });

    const result = await setGalleryDownloadsAction({ galleryId, shootId, downloadsEnabled: true });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.setGalleryDownloadsEnabled).not.toHaveBeenCalled();
  });

  it("publishes through a staff action and revalidates the gallery route", async () => {
    await expect(publishGalleryAction({ galleryId, shootId })).resolves.toEqual({ ok: true, data: { id: galleryId } });

    expect(mocks.publishGallery).toHaveBeenCalledWith(galleryId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/galerias/${shootId}`);
  });
});
