// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({ recordAuditEvent: vi.fn() }));

vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import { REFERRAL_MESSAGES, ReferralError } from "@/domain/referrals/errors";
import { linkLeadReferralOnConversion, type ReferralWriter } from "@/domain/referrals/lead-conversion";

const LEAD_ID = "00000000-0000-4000-8000-000000000301";
const REFERRER_ID = "00000000-0000-4000-8000-000000000302";
const CLIENT_ID = "00000000-0000-4000-8000-000000000303";
const REFERRAL_ID = "00000000-0000-4000-8000-000000000304";
const ACTOR_ID = "00000000-0000-4000-8000-000000000305";
const convertedAt = new Date("2026-09-26T12:00:00.000Z");

const informed = {
  id: REFERRAL_ID,
  referrerClientId: REFERRER_ID,
  referredClientId: null,
  leadId: LEAD_ID,
  source: "lead",
  createdAt: new Date("2026-09-10T12:00:00.000Z"),
  convertedAt: null,
};

function makeTx(selectResults: unknown[][], update: { rows?: unknown[]; error?: Error } = {}) {
  const queue = [...selectResults];
  const lock = vi.fn();
  const limit = vi.fn().mockImplementation(() => {
    const result = Promise.resolve(queue.shift() ?? []);
    lock.mockReturnValue(result);
    return Object.assign(result, { for: lock });
  });
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const returning = update.error ? vi.fn().mockRejectedValue(update.error) : vi.fn().mockResolvedValue(update.rows ?? []);
  const updateWhere = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where: updateWhere });
  const tx = {
    select: vi.fn().mockReturnValue({ from }),
    update: vi.fn().mockReturnValue({ set }),
    insert: vi.fn(),
  };
  return { tx: tx as unknown as ReferralWriter, raw: tx, lock, set, updateWhere };
}

const input = { leadId: LEAD_ID, clientId: CLIENT_ID, convertedAt, actorUserId: ACTOR_ID };

describe("linkLeadReferralOnConversion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("does nothing for a Lead without referral", async () => {
    const { tx, raw } = makeTx([[]]);

    await expect(linkLeadReferralOnConversion(tx, input)).resolves.toBeNull();
    expect(raw.update).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("points the locked referral to the converted Client with the conversion timestamp and audits it", async () => {
    const converted = { ...informed, referredClientId: CLIENT_ID, convertedAt };
    const { tx, lock, set, updateWhere } = makeTx([[informed], []], { rows: [converted] });

    await expect(linkLeadReferralOnConversion(tx, input)).resolves.toEqual(converted);

    expect(lock).toHaveBeenCalledWith("update");
    expect(set).toHaveBeenCalledWith({ referredClientId: CLIENT_ID, convertedAt });
    const query = new PgDialect().sqlToQuery(updateWhere.mock.calls[0]?.[0]);
    expect(query.sql).toContain('"referrals"."id" = $1');
    expect(query.sql).toContain('"referrals"."referred_client_id" is null');
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      {
        actorUserId: ACTOR_ID,
        action: "lead.referral_converted",
        entityType: "lead",
        entityId: LEAD_ID,
        before: { referralId: REFERRAL_ID, referredClientId: null, convertedAt: null },
        after: { referralId: REFERRAL_ID, referredClientId: CLIENT_ID, convertedAt },
      },
      tx,
    );
  });

  it("rejects converting the Lead into its own referrer", async () => {
    const { tx, raw } = makeTx([[{ ...informed, referrerClientId: CLIENT_ID }]]);

    await expect(linkLeadReferralOnConversion(tx, input)).rejects.toThrow(
      new ReferralError(REFERRAL_MESSAGES.conversionSelf),
    );
    expect(raw.update).not.toHaveBeenCalled();
  });

  it("rejects a Client that is already referred by another referral", async () => {
    const { tx, raw } = makeTx([[informed], [{ id: "other-referral" }]]);

    await expect(linkLeadReferralOnConversion(tx, input)).rejects.toThrow(REFERRAL_MESSAGES.conversionAlreadyReferred);
    expect(raw.update).not.toHaveBeenCalled();
  });

  it("keeps an already linked referral and rejects one linked to another Client", async () => {
    const linked = { ...informed, referredClientId: CLIENT_ID, convertedAt };
    await expect(linkLeadReferralOnConversion(makeTx([[linked]]).tx, input)).resolves.toEqual(linked);

    const elsewhere = { ...informed, referredClientId: REFERRER_ID.replace("302", "399"), convertedAt };
    await expect(linkLeadReferralOnConversion(makeTx([[elsewhere]]).tx, input)).rejects.toThrow(
      REFERRAL_MESSAGES.conversionMismatch,
    );
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("maps the cycle trigger to a ReferralError", async () => {
    const cycle = Object.assign(new Error("referral cycle"), { constraint_name: "referrals_no_cycle" });
    const { tx } = makeTx([[informed], []], { error: new Error("Failed query", { cause: cycle }) });

    await expect(linkLeadReferralOnConversion(tx, input)).rejects.toThrow(new ReferralError(REFERRAL_MESSAGES.cycle));
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });
});
