import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { readStylingReferences } from "@/domain/styling/read";
import { STYLING_BUCKET } from "@/domain/styling/schema";

const SHOOT_ID = "00000000-0000-4000-8000-000000000011";

function stylingReadFixture(options?: {
  rowError?: unknown;
  signedError?: unknown;
  signedData?: Array<{ signedUrl: string }> | null;
}) {
  const rows = [
    {
      id: "ref-1",
      shoot_id: SHOOT_ID,
      storage_path: "user/shoot/one.webp",
      caption: "Primeira",
      origin: "client",
      uploaded_by_auth_user_id: "user-1",
      created_at: "2026-09-07T12:00:00Z",
    },
    {
      id: "ref-2",
      shoot_id: SHOOT_ID,
      storage_path: "staff/shoot/two.jpg",
      caption: null,
      origin: "studio",
      uploaded_by_auth_user_id: "staff-1",
      created_at: "2026-09-07T13:00:00Z",
    },
  ];
  const order = vi.fn(async () => ({ data: rows, error: options?.rowError ?? null }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const createSignedUrls = vi.fn(async () => ({
    data:
      options?.signedData === undefined
        ? [
            { signedUrl: "https://private.test/one?signed=1" },
            { signedUrl: "https://private.test/two?signed=2" },
          ]
        : options.signedData,
    error: options?.signedError ?? null,
  }));
  const storageFrom = vi.fn(() => ({ createSignedUrls }));
  const supabase = {
    from: vi.fn(() => ({ select })),
    storage: { from: storageFrom },
  } as unknown as SupabaseClient;
  return { supabase, select, eq, order, createSignedUrls, storageFrom };
}

describe("readStylingReferences", () => {
  it("maps chronological rows to one batch of one-hour private signed URLs", async () => {
    const fixture = stylingReadFixture();

    await expect(readStylingReferences(fixture.supabase, SHOOT_ID)).resolves.toEqual([
      {
        id: "ref-1",
        shootId: SHOOT_ID,
        storagePath: "user/shoot/one.webp",
        signedUrl: "https://private.test/one?signed=1",
        caption: "Primeira",
        origin: "client",
        uploadedByAuthUserId: "user-1",
        createdAt: "2026-09-07T12:00:00Z",
      },
      {
        id: "ref-2",
        shootId: SHOOT_ID,
        storagePath: "staff/shoot/two.jpg",
        signedUrl: "https://private.test/two?signed=2",
        caption: null,
        origin: "studio",
        uploadedByAuthUserId: "staff-1",
        createdAt: "2026-09-07T13:00:00Z",
      },
    ]);
    expect(fixture.select).toHaveBeenCalledWith(
      "id,shoot_id,storage_path,caption,origin,uploaded_by_auth_user_id,created_at"
    );
    expect(fixture.eq).toHaveBeenCalledWith("shoot_id", SHOOT_ID);
    expect(fixture.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(fixture.storageFrom).toHaveBeenCalledWith(STYLING_BUCKET);
    expect(fixture.createSignedUrls).toHaveBeenCalledWith(
      ["user/shoot/one.webp", "staff/shoot/two.jpg"],
      3600
    );
  });

  it("does not call Storage when no rows exist", async () => {
    const fixture = stylingReadFixture();
    fixture.order.mockResolvedValueOnce({ data: [], error: null });

    await expect(readStylingReferences(fixture.supabase, SHOOT_ID)).resolves.toEqual([]);
    expect(fixture.createSignedUrls).not.toHaveBeenCalled();
  });

  it("fails closed when row reads, signing, or signed URL cardinality fail", async () => {
    const rowError = new Error("raw table error");
    await expect(
      readStylingReferences(stylingReadFixture({ rowError }).supabase, SHOOT_ID)
    ).rejects.toMatchObject({ message: "styling references unavailable", cause: rowError });

    const signingError = new Error("raw storage error");
    await expect(
      readStylingReferences(stylingReadFixture({ signedError: signingError }).supabase, SHOOT_ID)
    ).rejects.toMatchObject({ message: "styling references unavailable", cause: signingError });

    await expect(
      readStylingReferences(
        stylingReadFixture({ signedData: [{ signedUrl: "https://only-one" }] }).supabase,
        SHOOT_ID
      )
    ).rejects.toThrow("styling references unavailable");
  });
});
