import { describe, expect, it } from "vitest";
import { getContractorProfile } from "@/domain/contracts/contractor";

const completeEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  STUDIO_CONTRACTOR_NAME: "Contractor Test",
  STUDIO_CONTRACTOR_CPF: "111.444.777-35",
  STUDIO_CONTRACTOR_ADDRESS: "Rua Profissional, 1",
};

describe("getContractorProfile", () => {
  it("returns a complete protected contractor profile", () => {
    expect(getContractorProfile(completeEnv)).toEqual({
      name: "Contractor Test",
      cpf: "11144477735",
      address: "Rua Profissional, 1",
    });
  });

  it("rejects an incomplete contractor configuration", () => {
    expect(() => getContractorProfile({ ...completeEnv, STUDIO_CONTRACTOR_ADDRESS: "" })).toThrow(
      "contractor configuration is incomplete",
    );
  });

  it("rejects an invalid contractor CPF", () => {
    expect(() => getContractorProfile({ ...completeEnv, STUDIO_CONTRACTOR_CPF: "00000000000" })).toThrow(
      "contractor configuration is invalid",
    );
  });
});
