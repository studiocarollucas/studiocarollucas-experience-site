import { describe, expect, it } from "vitest";
import { buildContractSnapshot, CONTRACT_TEMPLATE_VERSION, CONTRACTS_BUCKET } from "@/domain/contracts/snapshot";

describe("buildContractSnapshot", () => {
  it("creates a fresh historical snapshot from issuance-time values only", () => {
    const context = {
      contractor: { name: "Contractor Test", cpf: "11144477735", address: "Rua Profissional, 1" },
      client: {
        name: "Client Test",
        cpf: "11144477735",
        birthday: "1994-03-12",
        phone: "+55 92 99999-9999",
        addressStreet: "Rua Cliente",
        addressNumber: "12",
        addressComplement: "Casa B",
        addressNeighborhood: "Centro",
        addressCity: "Manaus",
        addressState: "AM",
        addressPostalCode: "69000-000",
        email: "excluded@example.test",
        instagramHandle: "excluded_handle",
        authUserId: "00000000-0000-4000-8000-000000000099",
        notes: "internal only",
      },
      shoot: {
        date: "2026-10-10",
        startTime: "14:00",
        locationName: "Estúdio Teste",
        locationAddress: "Rua da Sessão, 10",
        internalProductionNote: "exclude this",
      },
      package: {
        name: "Ensaio Teste",
        description: "Pacote de teste",
        durationMinutes: 60,
        includedPhotos: 20,
        scenes: "Interno",
      },
      agreedPrice: "300",
      payments: [
        { amount: "100", status: "confirmado" as const, proofUrl: "https://proof.example.test/one" },
        { amount: "25.50", status: "confirmado" as const, proofUrl: "https://proof.example.test/two" },
        { amount: "99.99", status: "pendente" as const, proofUrl: "https://proof.example.test/three" },
        { amount: "50.00", status: "estornado" as const, proofUrl: "https://proof.example.test/four" },
      ],
      imageUsage: "authorized" as const,
    };

    const snapshot = buildContractSnapshot(context);
    context.client.name = "Changed after issuance";
    context.payments[0].amount = "999.99";

    expect(snapshot).toEqual({
      contractor: context.contractor,
      client: {
        name: "Client Test",
        cpf: "11144477735",
        birthday: "1994-03-12",
        address: "Rua Cliente, 12, Casa B, Centro, Manaus - AM, 69000-000",
        phone: "+55 92 99999-9999",
      },
      shoot: {
        date: "2026-10-10",
        startTime: "14:00",
        locationName: "Estúdio Teste",
        locationAddress: "Rua da Sessão, 10",
      },
      package: {
        name: "Ensaio Teste",
        description: "Pacote de teste",
        durationMinutes: 60,
        includedPhotos: 20,
        scenes: "Interno",
      },
      finance: { agreedPrice: "300.00", confirmedPaid: "125.50", balance: "174.50" },
      terms: {
        rescheduleFee: "50.00",
        rescheduleWindowDays: 15,
        refundWindowDays: 30,
        imageUsageAuthorized: true,
      },
    });
    expect(snapshot).not.toHaveProperty("notes");
    expect(JSON.stringify(snapshot)).not.toContain("proof.example.test");
    expect(JSON.stringify(snapshot)).not.toContain("excluded@example.test");
    expect(JSON.stringify(snapshot)).not.toContain("excluded_handle");
    expect(JSON.stringify(snapshot)).not.toContain("00000000-0000-4000-8000-000000000099");
    expect(CONTRACT_TEMPLATE_VERSION).toBe("1.0");
    expect(CONTRACTS_BUCKET).toBe("contracts");
  });
});
