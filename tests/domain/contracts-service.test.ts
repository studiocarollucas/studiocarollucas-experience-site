// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { issueContract, type IssueContractDeps } from "@/domain/contracts/service";
import { logger } from "@/lib/observability/logger";

const CONTRACT_ID = "00000000-0000-4000-8000-000000000123";
const SHOOT_ID = "00000000-0000-4000-8000-000000000456";
const CLIENT_ID = "00000000-0000-4000-8000-000000000789";

const validInput = {
  shootId: SHOOT_ID,
  cpf: "111.444.777-35",
  birthday: "1994-03-12",
  addressStreet: "Rua de Teste",
  addressNumber: "12",
  addressNeighborhood: "Centro de Teste",
  addressCity: "Manaus",
  addressState: "AM",
  addressPostalCode: "69000-000",
  imageUsage: "authorized" as const,
};

function createDeps(overrides: Partial<IssueContractDeps> = {}): IssueContractDeps {
  const db: IssueContractDeps["db"] = {
    transaction: vi.fn(async (operation) => operation(db)),
    updateClientCivilData: vi.fn().mockResolvedValue(undefined),
    insertContract: vi.fn().mockResolvedValue(undefined),
    insertAuditEvent: vi.fn().mockResolvedValue(undefined),
  };

  return {
    getContractorProfile: () => ({
      name: "Prestadora de Teste",
      cpf: "11144477735",
      address: "Endereço profissional de teste",
    }),
    getIssueContext: vi.fn().mockResolvedValue({
      shoot: {
        id: SHOOT_ID,
        date: "2026-10-10",
        startTime: "14:00",
        locationName: "Estúdio de Teste",
        locationAddress: "Local de Teste",
        agreedPrice: "300.00",
      },
      client: { id: CLIENT_ID, name: "Cliente de Teste", phone: "+55 00 90000-0000" },
      package: {
        name: "Pacote de Teste",
        description: "Descrição de teste",
        durationMinutes: 60,
        includedPhotos: 20,
        scenes: "Estúdio",
      },
      payments: [{ amount: "100.00", status: "confirmado" as const }],
    }),
    renderPdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    storage: {
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn(),
    },
    db,
    randomUUID: () => CONTRACT_ID,
    now: () => "2026-09-07T12:00:00.000Z",
    ...overrides,
  };
}

describe("issueContract", () => {
  it("uploads a private PDF and persists the contract with a redacted audit entry in one transaction", async () => {
    const deps = createDeps();

    await expect(
      issueContract(deps, { input: validInput, issuedByAuthUserId: "00000000-0000-4000-8000-000000000111" }),
    ).resolves.toMatchObject({
      status: "issued",
      imageUsageAuthorized: true,
      pdfStoragePath: expect.stringMatching(/^contracts\/[0-9a-f-]{36}\.pdf$/i),
    });

    expect(deps.storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^contracts\/[0-9a-f-]{36}\.pdf$/i),
      expect.any(Uint8Array),
      { contentType: "application/pdf", upsert: false },
    );
    expect(deps.db.transaction).toHaveBeenCalledOnce();
    expect(deps.db.updateClientCivilData).toHaveBeenCalledWith(CLIENT_ID, {
      cpf: "11144477735",
      birthday: "1994-03-12",
      addressStreet: "Rua de Teste",
      addressNumber: "12",
      addressComplement: undefined,
      addressNeighborhood: "Centro de Teste",
      addressCity: "Manaus",
      addressState: "AM",
      addressPostalCode: "69000000",
    });
    expect(deps.db.insertContract).toHaveBeenCalledOnce();
    expect(deps.db.insertAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "contract.issued",
        entityType: "contract",
        entityId: CONTRACT_ID,
        after: {
          contractId: CONTRACT_ID,
          contractNumber: `SCL-${CONTRACT_ID.toUpperCase()}`,
          shootId: SHOOT_ID,
          templateVersion: "1.0",
          imageUsageAuthorized: true,
        },
      }),
    );
    const auditPayload = JSON.stringify(vi.mocked(deps.db.insertAuditEvent).mock.calls[0]?.[0]);
    expect(auditPayload).not.toContain(validInput.cpf.replace(/\D/g, ""));
    expect(auditPayload).not.toContain(validInput.addressStreet);
  });

  it("does not persist a contract when private storage upload fails", async () => {
    const deps = createDeps({
      storage: {
        upload: vi.fn().mockResolvedValue({ error: new Error("storage unavailable") }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn(),
      },
    });

    await expect(
      issueContract(deps, { input: validInput, issuedByAuthUserId: "00000000-0000-4000-8000-000000000111" }),
    ).rejects.toThrow("contract issuance failed");
    expect(deps.db.insertContract).not.toHaveBeenCalled();
  });

  it("removes the uploaded PDF when the database transaction fails", async () => {
    const deps = createDeps();
    vi.mocked(deps.db.insertContract).mockRejectedValue(new Error("database unavailable"));
    const expectedPath = `contracts/${CONTRACT_ID}.pdf`;

    await expect(
      issueContract(deps, { input: validInput, issuedByAuthUserId: "00000000-0000-4000-8000-000000000111" }),
    ).rejects.toThrow("contract issuance failed");
    expect(deps.storage.remove).toHaveBeenCalledWith([expectedPath]);
  });

  it("logs only contract identifiers when compensating cleanup also fails", async () => {
    const deps = createDeps({
      storage: {
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: new Error("cleanup unavailable") }),
        createSignedUrl: vi.fn(),
      },
    });
    vi.mocked(deps.db.insertContract).mockRejectedValue(new Error("database unavailable"));
    const loggerError = vi.spyOn(logger, "error").mockImplementation(() => undefined);

    await expect(
      issueContract(deps, { input: validInput, issuedByAuthUserId: "00000000-0000-4000-8000-000000000111" }),
    ).rejects.toThrow("contract issuance failed");

    expect(loggerError).toHaveBeenCalledWith("contract PDF cleanup failed", {
      contractId: CONTRACT_ID,
      pdfStoragePath: `contracts/${CONTRACT_ID}.pdf`,
    });
    loggerError.mockRestore();
  });

  it("still returns the neutral issuance error when cleanup rejects", async () => {
    const deps = createDeps({
      storage: {
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockRejectedValue(new Error("cleanup unavailable")),
        createSignedUrl: vi.fn(),
      },
    });
    vi.mocked(deps.db.insertContract).mockRejectedValue(new Error("database unavailable"));

    await expect(
      issueContract(deps, { input: validInput, issuedByAuthUserId: "00000000-0000-4000-8000-000000000111" }),
    ).rejects.toThrow("contract issuance failed");
  });
});
