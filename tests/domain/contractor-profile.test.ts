// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  where: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  returning: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));

import { contractorProfileSchema } from "@/domain/contractor-profile/schema";
import {
  getActiveContractorProfile,
  upsertActiveContractorProfile,
} from "@/domain/contractor-profile/service";

const individual = {
  personType: "individual" as const,
  legalName: "  Carol Lucas  ",
  document: "529.982.247-25",
  address: "  Rua das Flores, 10  ",
};

const company = {
  personType: "company" as const,
  legalName: "  Carol Lucas Fotografia LTDA  ",
  document: "04.252.011/0001-10",
  address: "  Rua das Flores, 10  ",
};

describe("contractorProfileSchema", () => {
  it("accepts a valid CPF and normalizes the individual profile", () => {
    expect(contractorProfileSchema.parse(individual)).toEqual({
      personType: "individual",
      legalName: "Carol Lucas",
      document: "52998224725",
      address: "Rua das Flores, 10",
    });
  });

  it("rejects an invalid CPF", () => {
    const parsed = contractorProfileSchema.safeParse({ ...individual, document: "111.111.111-11" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors.document).toContain("CPF inválido");
  });

  it("accepts a valid CNPJ and normalizes the company profile", () => {
    expect(contractorProfileSchema.parse(company)).toEqual({
      personType: "company",
      legalName: "Carol Lucas Fotografia LTDA",
      document: "04252011000110",
      address: "Rua das Flores, 10",
    });
  });

  it("rejects an invalid CNPJ", () => {
    const parsed = contractorProfileSchema.safeParse({ ...company, document: "04.252.011/0001-11" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors.document).toContain("CNPJ inválido");
  });
});

describe("active contractor profile persistence", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when no active profile exists", async () => {
    mocks.limit.mockResolvedValue([]);
    mocks.where.mockReturnValue({ limit: mocks.limit });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    await expect(getActiveContractorProfile()).resolves.toBeNull();
  });

  it("upserts the single active profile using normalized data", async () => {
    const persisted = {
      id: "00000000-0000-4000-8000-000000000123",
      scope: "active",
      personType: "company",
      legalName: "Carol Lucas Fotografia LTDA",
      document: "04252011000110",
      address: "Rua das Flores, 10",
    };
    mocks.returning.mockResolvedValue([persisted]);
    mocks.onConflictDoUpdate.mockReturnValue({ returning: mocks.returning });
    mocks.values.mockReturnValue({ onConflictDoUpdate: mocks.onConflictDoUpdate });
    mocks.insert.mockReturnValue({ values: mocks.values });

    await expect(upsertActiveContractorProfile(company)).resolves.toEqual(persisted);
    expect(mocks.values).toHaveBeenCalledWith({
      scope: "active",
      personType: "company",
      legalName: "Carol Lucas Fotografia LTDA",
      document: "04252011000110",
      address: "Rua das Flores, 10",
    });
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith(expect.objectContaining({
      set: expect.objectContaining({
        personType: "company",
        legalName: "Carol Lucas Fotografia LTDA",
        document: "04252011000110",
        address: "Rua das Flores, 10",
      }),
    }));
  });
});
