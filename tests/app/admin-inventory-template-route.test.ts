import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createInventoryImportTemplate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/inventory/import-template", () => ({
  createInventoryImportTemplate: mocks.createInventoryImportTemplate,
}));

import { GET } from "@/app/api/admin/inventario/template/route";

describe("GET /api/admin/inventario/template", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createInventoryImportTemplate.mockReturnValue(new Uint8Array([1, 2, 3]));
  });

  it("returns an XLSX attachment to staff", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-1", email: "staff@example.com", role: "staff" });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(mocks.createInventoryImportTemplate).toHaveBeenCalledOnce();
  });

  it("rejects unauthenticated and client requests", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(GET()).resolves.toMatchObject({ status: 403 });

    mocks.getCurrentUser.mockResolvedValue({ id: "client-1", email: "client@example.com", role: "client" });
    await expect(GET()).resolves.toMatchObject({ status: 403 });
    expect(mocks.createInventoryImportTemplate).not.toHaveBeenCalled();
  });
});
