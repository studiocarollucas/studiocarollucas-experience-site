// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  where: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  returning: vi.fn(),
  onConflictDoNothing: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));

import { getOrCreateGalleryForShoot } from "@/domain/gallery/service";

describe("getOrCreateGalleryForShoot", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the gallery created for a shoot", async () => {
    const gallery = { id: "gallery-1", shootId: "shoot-1", status: "draft" };
    mocks.returning.mockResolvedValue([gallery]);
    mocks.onConflictDoNothing.mockReturnValue({ returning: mocks.returning });
    mocks.values.mockReturnValue({ onConflictDoNothing: mocks.onConflictDoNothing });
    mocks.insert.mockReturnValue({ values: mocks.values });

    await expect(getOrCreateGalleryForShoot("shoot-1")).resolves.toEqual(gallery);
    expect(mocks.values).toHaveBeenCalledWith({ shootId: "shoot-1" });
    expect(mocks.onConflictDoNothing).toHaveBeenCalledOnce();
  });

  it("returns the existing Gallery instead of creating a second one", async () => {
    const gallery = { id: "gallery-1", shootId: "shoot-1", status: "draft" };
    mocks.returning.mockResolvedValueOnce([gallery]).mockResolvedValueOnce([]);
    mocks.onConflictDoNothing.mockReturnValue({ returning: mocks.returning });
    mocks.values.mockReturnValue({ onConflictDoNothing: mocks.onConflictDoNothing });
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.limit.mockResolvedValue([gallery]);
    mocks.where.mockReturnValue({ limit: mocks.limit });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    await expect(getOrCreateGalleryForShoot("shoot-1")).resolves.toEqual(gallery);
    await expect(getOrCreateGalleryForShoot("shoot-1")).resolves.toEqual(gallery);
    expect(mocks.values).toHaveBeenCalledTimes(2);
    expect(mocks.select).toHaveBeenCalledOnce();
  });

  it("throws when a conflicting gallery cannot be read back", async () => {
    mocks.returning.mockResolvedValue([]);
    mocks.onConflictDoNothing.mockReturnValue({ returning: mocks.returning });
    mocks.values.mockReturnValue({ onConflictDoNothing: mocks.onConflictDoNothing });
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.limit.mockResolvedValue([]);
    mocks.where.mockReturnValue({ limit: mocks.limit });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    await expect(getOrCreateGalleryForShoot("shoot-1")).rejects.toThrow(
      "não foi possível obter a galeria do ensaio",
    );
  });
});
