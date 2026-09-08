import { describe, expect, it } from "vitest";
import { issueContractSchema } from "@/domain/contracts/schema";

const valid = {
  shootId: "00000000-0000-4000-8000-000000000001",
  cpf: "111.444.777-35",
  birthday: "1994-03-12",
  addressStreet: "Rua Teste",
  addressNumber: "12",
  addressNeighborhood: "Centro",
  addressCity: "Manaus",
  addressState: "AM",
  addressPostalCode: "69000-000",
  imageUsage: "authorized",
};

describe("issueContractSchema", () => {
  it("accepts complete civil data needed to issue a contract", () => {
    expect(issueContractSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid CPF", () => {
    expect(issueContractSchema.safeParse({ ...valid, cpf: "00000000000" }).success).toBe(false);
  });

  it("requires every address field needed for a contract", () => {
    expect(issueContractSchema.safeParse({ ...valid, addressCity: "" }).success).toBe(false);
  });

  it("requires an explicit image-usage choice", () => {
    expect(issueContractSchema.safeParse({ ...valid, imageUsage: undefined }).success).toBe(false);
  });
});
