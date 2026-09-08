// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getClientById: vi.fn(), createClient: vi.fn(), updateClient: vi.fn(), recordAuditEvent: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/clients/service", () => ({ getClientById: mocks.getClientById, updateClient: mocks.updateClient, createClient: mocks.createClient }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createClientAction, updateClientAction } from "@/domain/clients/actions";

const clientId = "00000000-0000-4000-8000-000000000789";
const civilKeys = ["cpf", "birthday", "addressStreet", "addressNumber", "addressComplement", "addressNeighborhood", "addressCity", "addressState", "addressPostalCode"];

describe("client update audit privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-1", role: "staff" });
  });

  it("omits civil fields from the creation audit while preserving other fields", async () => {
    const ordinary = { id: clientId, name: "Test client", phone: null, email: null, notes: "Test notes", marketingConsent: false };
    const civilData = Object.fromEntries(civilKeys.map((key) => [key, `test-${key}`]));
    mocks.createClient.mockResolvedValue({ ...ordinary, ...civilData });
    expect(await createClientAction({ name: "Test client" })).toEqual({ ok: true, data: { id: clientId } });
    const event = mocks.recordAuditEvent.mock.calls[0][0];
    for (const key of civilKeys) expect(event.after).not.toHaveProperty(key);
    expect(event).toEqual({ actorUserId: "staff-1", action: "client.created", entityType: "client", entityId: clientId, before: null, after: ordinary });
  });

  it("omits civil fields from before and after while preserving the other audit data", async () => {
    const ordinary = { id: clientId, name: "Test client", phone: null, email: null, notes: "Test notes", marketingConsent: false };
    const civilData = Object.fromEntries(civilKeys.map((key) => [key, `test-${key}`]));
    mocks.getClientById.mockResolvedValue({ ...ordinary, ...civilData });
    mocks.updateClient.mockResolvedValue({ ...ordinary, name: "Updated client", ...civilData });

    expect(await updateClientAction({ id: clientId, name: "Updated client" })).toEqual({ ok: true, data: { id: clientId } });
    const event = mocks.recordAuditEvent.mock.calls[0][0];
    for (const key of civilKeys) {
      expect(event.before).not.toHaveProperty(key);
      expect(event.after).not.toHaveProperty(key);
    }
    expect(event).toEqual({ actorUserId: "staff-1", action: "client.updated", entityType: "client", entityId: clientId, before: ordinary, after: { ...ordinary, name: "Updated client" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/clientes/${clientId}`);
  });
});
