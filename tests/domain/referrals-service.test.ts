// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import { REFERRAL_MESSAGES, ReferralError } from "@/domain/referrals/errors";
import { recordClientReferral, removeLeadReferral, setLeadReferral } from "@/domain/referrals/service";

const LEAD_ID = "00000000-0000-4000-8000-000000000201";
const REFERRER_ID = "00000000-0000-4000-8000-000000000202";
const OTHER_REFERRER_ID = "00000000-0000-4000-8000-000000000203";
const CONVERTED_CLIENT_ID = "00000000-0000-4000-8000-000000000204";
const REFERRAL_ID = "00000000-0000-4000-8000-000000000205";
const ACTOR_ID = "00000000-0000-4000-8000-000000000206";

const convertedAt = new Date("2026-09-20T12:00:00.000Z");

function referral(overrides: Record<string, unknown> = {}) {
  return {
    id: REFERRAL_ID,
    referrerClientId: REFERRER_ID,
    referredClientId: null,
    leadId: LEAD_ID,
    source: "lead",
    createdAt: convertedAt,
    convertedAt: null,
    ...overrides,
  };
}

/**
 * A fake transaction whose `select(...)...limit()` chains answer, in order, the
 * queued results; insert/update/delete resolve to the given rows.
 */
function makeTx(
  selectResults: unknown[][],
  writes: { insert?: unknown[]; update?: unknown[]; delete?: unknown[] | Error; insertError?: Error } = {},
) {
  const queue = [...selectResults];
  const limit = vi.fn().mockImplementation(() => {
    const result = Promise.resolve(queue.shift() ?? []);
    return Object.assign(result, { for: vi.fn().mockReturnValue(result) });
  });
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const insertReturning = writes.insertError
    ? vi.fn().mockRejectedValue(writes.insertError)
    : vi.fn().mockResolvedValue(writes.insert ?? []);
  const values = vi.fn().mockReturnValue({ returning: insertReturning });
  const updateWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(writes.update ?? []) });
  const set = vi.fn().mockReturnValue({ where: updateWhere });
  const deleteWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(writes.delete ?? []) });
  const tx = {
    select: vi.fn().mockReturnValue({ from }),
    insert: vi.fn().mockReturnValue({ values }),
    update: vi.fn().mockReturnValue({ set }),
    delete: vi.fn().mockReturnValue({ where: deleteWhere }),
  };
  mocks.transaction.mockImplementation(async (operation: (tx: unknown) => unknown) => operation(tx));
  return { tx, values, set };
}

describe("setLeadReferral", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("validates ids before opening a transaction", async () => {
    await expect(
      setLeadReferral({ leadId: "x", referrerClientId: REFERRER_ID, actorUserId: ACTOR_ID }),
    ).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("records an informed referral for a Lead that is not converted yet and audits it on the Lead", async () => {
    const created = referral();
    // lead, referrer, conversion, existing referral
    const { tx, values } = makeTx([[{ id: LEAD_ID, clientId: null }], [{ id: REFERRER_ID }], [], []], {
      insert: [created],
    });

    await expect(
      setLeadReferral({ leadId: LEAD_ID, referrerClientId: REFERRER_ID, actorUserId: ACTOR_ID }),
    ).resolves.toEqual({ referral: created, changed: true });

    expect(values).toHaveBeenCalledWith({
      referrerClientId: REFERRER_ID,
      referredClientId: null,
      leadId: LEAD_ID,
      source: "lead",
      convertedAt: null,
    });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: ACTOR_ID,
        action: "lead.referral_recorded",
        entityType: "lead",
        entityId: LEAD_ID,
        before: null,
      }),
      tx,
    );
  });

  it("creates the referral already converted when the Lead was converted before", async () => {
    const created = referral({ referredClientId: CONVERTED_CLIENT_ID, convertedAt });
    const { values } = makeTx(
      [
        [{ id: LEAD_ID, clientId: CONVERTED_CLIENT_ID }],
        [{ id: REFERRER_ID }],
        [{ clientId: CONVERTED_CLIENT_ID, createdAt: convertedAt }],
        [],
        [],
      ],
      { insert: [created] },
    );

    await setLeadReferral({ leadId: LEAD_ID, referrerClientId: REFERRER_ID, actorUserId: ACTOR_ID });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ referredClientId: CONVERTED_CLIENT_ID, convertedAt }),
    );
  });

  it("rejects a Client referring herself (the Lead's own Client)", async () => {
    const { tx } = makeTx([[{ id: LEAD_ID, clientId: REFERRER_ID }], [{ id: REFERRER_ID }], []]);

    await expect(
      setLeadReferral({ leadId: LEAD_ID, referrerClientId: REFERRER_ID, actorUserId: ACTOR_ID }),
    ).rejects.toThrow(new ReferralError(REFERRAL_MESSAGES.self));
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("rejects an unknown Lead or referrer", async () => {
    makeTx([[]]);
    await expect(
      setLeadReferral({ leadId: LEAD_ID, referrerClientId: REFERRER_ID, actorUserId: ACTOR_ID }),
    ).rejects.toThrow(REFERRAL_MESSAGES.leadMissing);

    makeTx([[{ id: LEAD_ID, clientId: null }], []]);
    await expect(
      setLeadReferral({ leadId: LEAD_ID, referrerClientId: REFERRER_ID, actorUserId: ACTOR_ID }),
    ).rejects.toThrow(REFERRAL_MESSAGES.referrerMissing);
  });

  it("is a no-op when the same referrer is recorded again", async () => {
    const existing = referral();
    const { tx } = makeTx([[{ id: LEAD_ID, clientId: null }], [{ id: REFERRER_ID }], [], [existing]]);

    await expect(
      setLeadReferral({ leadId: LEAD_ID, referrerClientId: REFERRER_ID, actorUserId: ACTOR_ID }),
    ).resolves.toEqual({ referral: existing, changed: false });
    expect(tx.update).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("changes the referrer of an informed referral and audits before/after", async () => {
    const updated = referral({ referrerClientId: OTHER_REFERRER_ID });
    const { tx, set } = makeTx([[{ id: LEAD_ID, clientId: null }], [{ id: OTHER_REFERRER_ID }], [], [referral()]], {
      update: [updated],
    });

    await expect(
      setLeadReferral({ leadId: LEAD_ID, referrerClientId: OTHER_REFERRER_ID, actorUserId: ACTOR_ID }),
    ).resolves.toEqual({ referral: updated, changed: true });
    expect(set).toHaveBeenCalledWith({ referrerClientId: OTHER_REFERRER_ID });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "lead.referral_updated",
        before: expect.objectContaining({ referrerClientId: REFERRER_ID }),
        after: expect.objectContaining({ referrerClientId: OTHER_REFERRER_ID }),
      }),
      tx,
    );
  });

  it("never rewrites a converted referral", async () => {
    const { tx } = makeTx([
      [{ id: LEAD_ID, clientId: CONVERTED_CLIENT_ID }],
      [{ id: OTHER_REFERRER_ID }],
      [{ clientId: CONVERTED_CLIENT_ID, createdAt: convertedAt }],
      [referral({ referredClientId: CONVERTED_CLIENT_ID, convertedAt })],
    ]);

    await expect(
      setLeadReferral({ leadId: LEAD_ID, referrerClientId: OTHER_REFERRER_ID, actorUserId: ACTOR_ID }),
    ).rejects.toThrow(REFERRAL_MESSAGES.convertedLocked);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("turns the database cycle guard into an actionable ReferralError", async () => {
    const cycle = Object.assign(new Error("referral cycle"), { code: "23514", constraint_name: "referrals_no_cycle" });
    makeTx(
      [
        [{ id: LEAD_ID, clientId: CONVERTED_CLIENT_ID }],
        [{ id: REFERRER_ID }],
        [{ clientId: CONVERTED_CLIENT_ID, createdAt: convertedAt }],
        [],
        [],
      ],
      { insertError: new Error("Failed query", { cause: cycle }) },
    );

    await expect(
      setLeadReferral({ leadId: LEAD_ID, referrerClientId: REFERRER_ID, actorUserId: ACTOR_ID }),
    ).rejects.toThrow(new ReferralError(REFERRAL_MESSAGES.cycle));
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("removeLeadReferral", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("removes an informed referral and audits it on the Lead", async () => {
    const removed = referral();
    const { tx } = makeTx([], { delete: [removed] });

    await expect(removeLeadReferral({ leadId: LEAD_ID, actorUserId: ACTOR_ID })).resolves.toEqual({ removed: true });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "lead.referral_removed", entityType: "lead", entityId: LEAD_ID, after: null }),
      tx,
    );
  });

  it("refuses to remove a converted referral and treats a missing one as a no-op", async () => {
    makeTx([[{ id: REFERRAL_ID }]], { delete: [] });
    await expect(removeLeadReferral({ leadId: LEAD_ID, actorUserId: ACTOR_ID })).rejects.toThrow(
      REFERRAL_MESSAGES.convertedLocked,
    );

    makeTx([[]], { delete: [] });
    await expect(removeLeadReferral({ leadId: LEAD_ID, actorUserId: ACTOR_ID })).resolves.toEqual({ removed: false });
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("recordClientReferral", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("rejects self-referral before touching the database", async () => {
    await expect(
      recordClientReferral({ referrerClientId: REFERRER_ID, referredClientId: REFERRER_ID, actorUserId: ACTOR_ID }),
    ).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a Client that already has a referrer", async () => {
    const { tx } = makeTx([[{ id: REFERRER_ID }], [{ id: CONVERTED_CLIENT_ID }], [{ id: REFERRAL_ID }]]);

    await expect(
      recordClientReferral({ referrerClientId: REFERRER_ID, referredClientId: CONVERTED_CLIENT_ID, actorUserId: ACTOR_ID }),
    ).rejects.toThrow(REFERRAL_MESSAGES.alreadyReferred);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("records a converted client-to-client referral and audits it on the referred Client", async () => {
    const created = referral({ leadId: null, source: "cliente", referredClientId: CONVERTED_CLIENT_ID, convertedAt });
    const { tx, values } = makeTx([[{ id: REFERRER_ID }], [{ id: CONVERTED_CLIENT_ID }], []], { insert: [created] });

    await expect(
      recordClientReferral({ referrerClientId: REFERRER_ID, referredClientId: CONVERTED_CLIENT_ID, actorUserId: ACTOR_ID }),
    ).resolves.toEqual(created);
    expect(values).toHaveBeenCalledWith({
      referrerClientId: REFERRER_ID,
      referredClientId: CONVERTED_CLIENT_ID,
      source: "cliente",
      convertedAt: expect.any(Date),
    });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "client.referral_recorded", entityType: "client", entityId: CONVERTED_CLIENT_ID }),
      tx,
    );
  });
});
