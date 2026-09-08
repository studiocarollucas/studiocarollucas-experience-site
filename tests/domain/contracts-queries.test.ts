// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rows = [
    {
      shootId: "11111111-1111-4111-8111-111111111111",
      shootDate: "2026-10-10",
      startTime: "14:00",
      locationName: "Estúdio",
      locationAddress: "Rua das Flores, 10",
      agreedPrice: "300.00",
      clientId: "22222222-2222-4222-8222-222222222222",
      clientName: "Lia",
      clientPhone: "+55 92 99999-9999",
      clientCpf: "52998224725",
      clientBirthday: "1994-03-12",
      clientAddressStreet: "Rua A",
      clientAddressNumber: "42",
      clientAddressComplement: "Casa",
      clientAddressNeighborhood: "Centro",
      clientAddressCity: "Manaus",
      clientAddressState: "AM",
      clientAddressPostalCode: "69000000",
      packageName: "Ensaio",
      packageDescription: null,
      packageDurationMinutes: 60,
      packageIncludedPhotos: 20,
      packageScenes: null,
      paymentAmount: "300.00",
      paymentStatus: "confirmado" as const,
    },
  ];
  const chain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.where.mockResolvedValue(rows);

  return { db: { select: vi.fn(() => chain) } };
});

vi.mock("@/db/client", () => ({ db: mocks.db }));

import { getContractIssueContext } from "@/domain/contracts/queries";

describe("getContractIssueContext", () => {
  it("keeps civil data in the server-only issue context", async () => {
    const context = await getContractIssueContext("11111111-1111-4111-8111-111111111111");

    expect(context?.client).toMatchObject({
      cpf: "52998224725",
      addressPostalCode: "69000000",
    });
  });
});
