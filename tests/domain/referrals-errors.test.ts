import { describe, expect, it } from "vitest";
import { REFERRAL_MESSAGES, ReferralError, referralErrorFromDatabase } from "@/domain/referrals/errors";

function pgError(constraint: string) {
  return Object.assign(new Error("violation"), { code: "23505", constraint_name: constraint });
}

describe("referralErrorFromDatabase", () => {
  it("maps every referral constraint and the cycle trigger to a Portuguese message", () => {
    expect(referralErrorFromDatabase(pgError("referrals_no_cycle"))).toEqual(new ReferralError(REFERRAL_MESSAGES.cycle));
    expect(referralErrorFromDatabase(pgError("referrals_not_self"))?.message).toBe(REFERRAL_MESSAGES.self);
    expect(referralErrorFromDatabase(pgError("referrals_referred_client_id_unique"))?.message).toBe(
      REFERRAL_MESSAGES.alreadyReferred,
    );
    expect(referralErrorFromDatabase(pgError("referrals_lead_id_unique"))?.message).toBe(
      REFERRAL_MESSAGES.leadAlreadyReferred,
    );
  });

  it("follows the cause chain of wrapped driver errors", () => {
    const wrapped = new Error("Failed query", { cause: new Error("outer", { cause: pgError("referrals_no_cycle") }) });
    expect(referralErrorFromDatabase(wrapped)).toBeInstanceOf(ReferralError);
  });

  it("ignores unrelated errors", () => {
    expect(referralErrorFromDatabase(new Error("boom"))).toBeNull();
    expect(referralErrorFromDatabase(pgError("clients_pkey"))).toBeNull();
    expect(referralErrorFromDatabase(undefined)).toBeNull();
    expect(referralErrorFromDatabase("text")).toBeNull();
  });
});
