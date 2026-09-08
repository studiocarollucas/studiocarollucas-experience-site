// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, hasMinimumRole, getContractDownload, createSupabaseServerClient, supabase } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  hasMinimumRole: vi.fn(),
  getContractDownload: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/auth/rbac", () => ({ hasMinimumRole }));
vi.mock("@/domain/contracts/queries", () => ({ getContractDownload }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient }));

import { GET } from "@/app/api/admin/contracts/[id]/download/route";

const context = { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000123" }) };

beforeEach(() => {
  getCurrentUser.mockReset();
  hasMinimumRole.mockReset();
  getContractDownload.mockReset();
  createSupabaseServerClient.mockReset().mockResolvedValue(supabase);
  supabase.storage.from.mockReset().mockReturnValue({
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.test/contracts/signed" }, error: null }),
  });
});

describe("GET /api/admin/contracts/[id]/download", () => {
  it("refuses unauthenticated and non-staff requests before lookup or signing", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const unauthenticated = await GET(new Request("https://studio.test/api/admin/contracts/any/download"), context);

    expect(unauthenticated.status).toBe(403);
    expect(getContractDownload).not.toHaveBeenCalled();
    expect(supabase.storage.from).not.toHaveBeenCalled();

    getCurrentUser.mockResolvedValueOnce({ id: "user", email: "client@example.test", role: "client" });
    hasMinimumRole.mockReturnValueOnce(false);

    const nonStaff = await GET(new Request("https://studio.test/api/admin/contracts/any/download"), context);

    expect(nonStaff.status).toBe(403);
    expect(getContractDownload).not.toHaveBeenCalled();
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it("redirects staff to a one-minute signed private URL", async () => {
    getCurrentUser.mockResolvedValue({ id: "staff", email: "staff@example.test", role: "staff" });
    hasMinimumRole.mockReturnValue(true);
    getContractDownload.mockResolvedValue({ pdfStoragePath: "contracts/00000000-0000-4000-8000-000000000123.pdf" });
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.test/contracts/signed" }, error: null });
    supabase.storage.from.mockReturnValue({ createSignedUrl });

    const response = await GET(new Request("https://studio.test/api/admin/contracts/any/download"), context);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://storage.test/contracts/signed");
    expect(createSignedUrl).toHaveBeenCalledWith("contracts/00000000-0000-4000-8000-000000000123.pdf", 60);
  });

  it("returns a neutral not-found or storage-failure response without a signed URL", async () => {
    getCurrentUser.mockResolvedValue({ id: "staff", email: "staff@example.test", role: "staff" });
    hasMinimumRole.mockReturnValue(true);
    getContractDownload.mockResolvedValueOnce(null);

    const missing = await GET(new Request("https://studio.test/api/admin/contracts/missing/download"), context);

    expect(missing.status).toBe(404);
    expect(supabase.storage.from).not.toHaveBeenCalled();

    getContractDownload.mockResolvedValueOnce({ pdfStoragePath: "contracts/00000000-0000-4000-8000-000000000123.pdf" });
    const createSignedUrl = vi.fn().mockResolvedValue({ data: null, error: new Error("storage unavailable") });
    supabase.storage.from.mockReturnValue({ createSignedUrl });

    const failed = await GET(new Request("https://studio.test/api/admin/contracts/any/download"), context);

    expect(failed.status).toBe(500);
    expect(failed.headers.get("location")).toBeNull();
  });
});
