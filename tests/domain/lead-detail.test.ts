import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Lead } from "@/db/schema";

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/db/client", () => ({ db: mocks.db }));

import { getLeadDetail, transitionLeadStatus } from "@/domain/leads/detail";

const LEAD_ID = "00000000-0000-4000-8000-000000000001";
const STAFF_ID = "00000000-0000-4000-8000-000000000002";

const lead: Lead = {
  id: LEAD_ID,
  clientId: null,
  name: "Maria",
  phone: null,
  email: "maria@example.test",
  source: "quiz",
  occasion: null,
  quizResult: "Romântica",
  status: "novo",
  lostReason: null,
  owner: null,
  createdAt: new Date("2026-09-08T00:00:00.000Z"),
};

function configureTransition(current = lead, updated = { ...lead, status: "contato" as const }) {
  const returning = vi.fn().mockResolvedValue([updated]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });
  const limit = vi.fn().mockResolvedValue([current]);
  const selectWhere = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where: selectWhere });
  const tx = { select: vi.fn().mockReturnValue({ from }), update, insert };
  mocks.db.transaction.mockImplementation(async (operation) => operation(tx));
  return { tx, set, values, returning };
}

describe("transitionLeadStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a lost transition without a reason", async () => {
    await expect(transitionLeadStatus({ leadId: LEAD_ID, actorUserId: STAFF_ID, status: "perdido" })).rejects.toThrow(
      "Informe o motivo da perda",
    );
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("rejects a lost transition with a whitespace-only reason", async () => {
    await expect(
      transitionLeadStatus({ leadId: LEAD_ID, actorUserId: STAFF_ID, status: "perdido", lostReason: "   " }),
    ).rejects.toThrow("Informe o motivo da perda");
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("rejects a skipped transition", async () => {
    configureTransition();

    await expect(transitionLeadStatus({ leadId: LEAD_ID, actorUserId: STAFF_ID, status: "proposta" })).rejects.toThrow(
      "Transição de Lead inválida",
    );
  });

  it("rejects a transition from a terminal status", async () => {
    configureTransition({ ...lead, status: "ganho" });

    await expect(transitionLeadStatus({ leadId: LEAD_ID, actorUserId: STAFF_ID, status: "perdido", lostReason: "Sem retorno" })).rejects.toThrow(
      "Transição de Lead inválida",
    );
  });

  it("updates the Lead and records a minimal before-and-after audit event in one transaction", async () => {
    const updated = { ...lead, status: "contato" as const };
    const { set, values } = configureTransition(lead, updated);

    await expect(transitionLeadStatus({ leadId: LEAD_ID, actorUserId: STAFF_ID, status: "contato" })).resolves.toEqual(updated);

    expect(mocks.db.transaction).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith({ status: "contato", lostReason: null });
    expect(values).toHaveBeenCalledWith({
      actorUserId: STAFF_ID,
      action: "lead.status_changed",
      entityType: "lead",
      entityId: LEAD_ID,
      before: { status: "novo", lostReason: null },
      after: { status: "contato", lostReason: null },
    });
  });

  it("rejects a stale transition when the status changes before the conditional update", async () => {
    const { returning, values } = configureTransition();
    returning.mockResolvedValue([]);

    await expect(transitionLeadStatus({ leadId: LEAD_ID, actorUserId: STAFF_ID, status: "contato" })).rejects.toThrow(
      "Transição de Lead inválida",
    );
    expect(values).not.toHaveBeenCalled();
  });
});

describe("getLeadDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the Lead with its audit history newest first", async () => {
    const newestAudit = { id: "audit-2", createdAt: new Date("2026-09-08T12:00:00.000Z") };
    const oldestAudit = { id: "audit-1", createdAt: new Date("2026-09-08T11:00:00.000Z") };
    const auditOrderBy = vi.fn().mockResolvedValue([newestAudit, oldestAudit]);
    const auditWhere = vi.fn().mockReturnValue({ orderBy: auditOrderBy });
    const leadLimit = vi.fn().mockResolvedValue([lead]);
    const leadWhere = vi.fn().mockReturnValue({ limit: leadLimit });
    mocks.db.select
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: leadWhere }) })
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: auditWhere }) });

    await expect(getLeadDetail(LEAD_ID)).resolves.toEqual({ ...lead, audit: [newestAudit, oldestAudit] });
    expect(auditOrderBy).toHaveBeenCalledOnce();

    const filter = new PgDialect().sqlToQuery(sql`where ${auditWhere.mock.calls[0][0]}`);
    expect(filter.sql).toBe('where ("audit_log"."entity_id" = $1 and "audit_log"."entity_type" = $2)');
    expect(filter.params).toEqual([LEAD_ID, "lead"]);
  });
});
