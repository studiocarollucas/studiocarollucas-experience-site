// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: mocks }));

import { convertWonLead, findLeadClientCandidates } from "@/domain/leads/conversion";

const LEAD_ID = "00000000-0000-4000-8000-000000000001";
const STAFF_ID = "00000000-0000-4000-8000-000000000002";

describe("lead conversion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("requires an explicit existing-or-new choice for a won Lead", async () => {
    await expect(convertWonLead({ leadId: LEAD_ID, actorUserId: STAFF_ID, client: undefined as never })).rejects.toThrow(
      "Escolha um cliente existente ou crie um novo cliente",
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("finds clients whose normalized name, email, or phone matches the Lead", async () => {
    const candidates = [
      { id: "client-name", name: "Maria Silva", email: null, phone: null },
      { id: "client-email", name: "Outra Pessoa", email: "maria@example.com", phone: null },
      { id: "client-phone", name: "Terceira Pessoa", email: null, phone: "(92) 99999-0000" },
    ];
    const limit = vi.fn().mockResolvedValue([{ name: " Maria Silva ", email: "MARIA@EXAMPLE.COM", phone: "+55 92 99999-0000" }]);
    const leadWhere = vi.fn().mockReturnValue({ limit });
    const leadFrom = vi.fn().mockReturnValue({ where: leadWhere });
    const clientWhere = vi.fn().mockResolvedValue(candidates);
    const clientFrom = vi.fn().mockReturnValue({ where: clientWhere });
    mocks.select.mockReturnValueOnce({ from: leadFrom }).mockReturnValueOnce({ from: clientFrom });

    await expect(findLeadClientCandidates(LEAD_ID)).resolves.toEqual(candidates);
  });

  it("returns the prior conversion without creating a second Client or audit row", async () => {
    const client = { id: "client-1", name: "Maria Silva" };
    const conversion = { leadId: LEAD_ID, clientId: client.id, convertedByUserId: STAFF_ID };
    const lock = vi.fn().mockResolvedValue([{ id: LEAD_ID, status: "ganho", name: "Maria Silva", email: null, phone: null }]);
    const lockedLimit = vi.fn().mockReturnValue({ for: lock });
    const limit = vi.fn().mockResolvedValueOnce([conversion]).mockResolvedValueOnce([client]);
    const where = vi.fn().mockReturnValueOnce({ limit: lockedLimit }).mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const tx = { select: vi.fn().mockReturnValue({ from }), insert: vi.fn(), update: vi.fn() };
    mocks.transaction.mockImplementation(async (operation) => operation(tx));

    await expect(convertWonLead({ leadId: LEAD_ID, actorUserId: STAFF_ID, client: { mode: "new" } })).resolves.toEqual({
      client,
      conversion,
    });
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("creates a Client from the Lead, persists one conversion, updates the Lead, and audits it", async () => {
    const lead = { id: LEAD_ID, status: "ganho", clientId: null, name: "Maria Silva", email: "maria@example.com", phone: "92999990000" };
    const client = { id: "client-1", name: lead.name, email: lead.email, phone: lead.phone, source: "lead_conversion" };
    const conversion = { leadId: LEAD_ID, clientId: client.id, convertedByUserId: STAFF_ID };
    const lock = vi.fn().mockResolvedValue([lead]);
    const lockedLimit = vi.fn().mockReturnValue({ for: lock });
    const limit = vi.fn().mockResolvedValueOnce([]);
    const where = vi.fn().mockReturnValueOnce({ limit: lockedLimit }).mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const clientReturning = vi.fn().mockResolvedValue([client]);
    const clientValues = vi.fn().mockReturnValue({ returning: clientReturning });
    const conversionReturning = vi.fn().mockResolvedValue([conversion]);
    const conversionValues = vi.fn().mockReturnValue({ returning: conversionReturning });
    const updateWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ ...lead, clientId: client.id }]) });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const auditValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{}]) });
    const tx = {
      select: vi.fn().mockReturnValue({ from }),
      insert: vi.fn().mockReturnValueOnce({ values: clientValues }).mockReturnValueOnce({ values: conversionValues }).mockReturnValueOnce({ values: auditValues }),
      update: vi.fn().mockReturnValue({ set: updateSet }),
    };
    mocks.transaction.mockImplementation(async (operation) => operation(tx));

    await expect(convertWonLead({ leadId: LEAD_ID, actorUserId: STAFF_ID, client: { mode: "new" } })).resolves.toEqual({
      client,
      conversion,
    });
    expect(clientValues).toHaveBeenCalledWith({ name: lead.name, email: lead.email, phone: lead.phone, source: "lead_conversion" });
    expect(conversionValues).toHaveBeenCalledWith({ leadId: LEAD_ID, clientId: client.id, convertedByUserId: STAFF_ID });
    expect(updateSet).toHaveBeenCalledWith({ clientId: client.id });
    expect(auditValues).toHaveBeenCalledWith({
      actorUserId: STAFF_ID,
      action: "lead.converted",
      entityType: "lead",
      entityId: LEAD_ID,
      before: { clientId: null },
      after: { clientId: client.id },
    });
  });
});
