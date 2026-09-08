import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getClientById: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/clients/service", () => ({ getClientById: mocks.getClientById }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));
vi.mock("@/app/admin/(protected)/clientes/[id]/editar/edit-client-form", () => ({ EditClientForm: () => null }));

import EditClientPage from "@/app/admin/(protected)/clientes/[id]/editar/page";

describe("EditClientPage civil data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClientById.mockResolvedValue(null);
  });

  it.each([null, { id: "client-1", role: "client" }])("blocks unauthorized users before reading civil data: %j", async (user) => {
    mocks.getCurrentUser.mockResolvedValue(user);
    await expect(EditClientPage({ params: Promise.resolve({ id: "client-1" }) })).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.getClientById).not.toHaveBeenCalled();
  });

  it.each(["staff", "admin"])("allows %s to read the client", async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", role });
    await expect(EditClientPage({ params: Promise.resolve({ id: "client-1" }) })).rejects.toThrow("NOT_FOUND");
    expect(mocks.getClientById).toHaveBeenCalledWith("client-1");
  });
});
