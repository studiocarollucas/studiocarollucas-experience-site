// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { ContractSnapshot } from "@/db/schema";
import { renderContractPdf } from "@/domain/contracts/pdf";

const fixtureSnapshot = {
  contractor: {
    personType: "individual" as const,
    legalName: "Prestadora de Exemplo",
    document: "000.000.000-00",
    address: "Rua da Prestadora, 100 - Manaus/AM",
  },
  client: {
    name: "Cliente de Exemplo",
    cpf: "111.111.111-11",
    birthday: "1990-01-01",
    address: "Rua da Cliente, 200 - Manaus/AM",
    phone: "+55 92 90000-0000",
  },
  shoot: {
    date: "2026-10-10",
    startTime: "14:00",
    locationName: "Estúdio de Exemplo",
    locationAddress: "Avenida da Sessão, 300 - Manaus/AM",
  },
  package: {
    name: "Ensaio de Exemplo",
    description: "Sessão fotográfica de demonstração.",
    durationMinutes: 60,
    includedPhotos: 20,
    scenes: "Estúdio",
  },
  finance: { agreedPrice: "300.00", confirmedPaid: "100.00", balance: "200.00" },
  terms: {
    rescheduleFee: "50.00" as const,
    rescheduleWindowDays: 15,
    refundWindowDays: 30,
    imageUsageAuthorized: true,
  },
} satisfies ContractSnapshot;

const fixtureSnapshotWithPrivateData = {
  ...fixtureSnapshot,
  internalNote: "FORBIDDEN_INTERNAL_NOTE",
  serviceRoleKey: "FORBIDDEN_SERVICE_ROLE_KEY",
} as ContractSnapshot;

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

describe("renderContractPdf", () => {
  it("renders the fixed legal template with the opted-in image authorization", async () => {
    const buffer = await renderContractPdf({
      contractNumber: "CT-EXEMPLO-0001",
      issuedAt: "2026-09-07T12:00:00.000Z",
      snapshot: fixtureSnapshotWithPrivateData,
    });
    const text = await extractPdfText(buffer);

    expect(text).toContain("CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS");
    expect(text).toContain("R$ 50,00");
    expect(text).toContain("15 dias");
    expect(text).toContain("30 dias");
    expect(text).toContain("AUTORIZA o uso de imagem");
    expect(text).toContain("Blocos para assinatura manual");
    expect(text).toContain("Página 1 de 2");
    expect(text).toContain("Página 2 de 2");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
    expect(text).not.toContain("FORBIDDEN_SERVICE_ROLE_KEY");
    expect(text).not.toContain("FORBIDDEN_INTERNAL_NOTE");
  // @react-pdf/renderer and pdf-parse can exceed Vitest's 5s default on a cold worker.
  }, 10_000);

  it("renders the non-authorization wording when image usage is opted out", async () => {
    const buffer = await renderContractPdf({
      contractNumber: "CT-EXEMPLO-0002",
      issuedAt: "2026-09-07T12:00:00.000Z",
      snapshot: {
        ...fixtureSnapshot,
        terms: { ...fixtureSnapshot.terms, imageUsageAuthorized: false },
      },
    });

    await expect(extractPdfText(buffer)).resolves.toContain("NÃO AUTORIZA o uso de imagem");
  });

  it("numbers every generated page when snapshot content overflows the template", async () => {
    const buffer = await renderContractPdf({
      contractNumber: "CT-EXEMPLO-0003",
      issuedAt: "2026-09-07T12:00:00.000Z",
      snapshot: {
        ...fixtureSnapshot,
        package: {
          ...fixtureSnapshot.package,
          description: "Descrição extensa do pacote. ".repeat(350),
          scenes: "Detalhes adicionais da sessão. ".repeat(350),
        },
      },
    });
    const text = await extractPdfText(buffer);

    const totalPages = Number(text.match(/-- 1 of (\d+) --/)?.[1]);

    expect(totalPages).toBeGreaterThan(2);
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      expect(text).toContain(`Página ${pageNumber} de ${totalPages}`);
    }
  }, 10_000);
});
