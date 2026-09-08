import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const NOT_FOUND = "NOT_FOUND";
const mockedGetContext = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error(NOT_FOUND);
  },
}));
vi.mock("@/domain/contracts/queries", () => ({ getContractIssueContext: mockedGetContext }));
vi.mock("@/app/admin/(protected)/agenda/[id]/contrato/contract-issue-panel", () => ({
  ContractIssuePanel: () => <div>painel de emissão</div>,
}));

import ContractIssuePage from "@/app/admin/(protected)/agenda/[id]/contrato/page";

const shootId = "00000000-0000-4000-8000-000000000123";

describe("ContractIssuePage", () => {
  it("returns notFound when no shoot can be issued", async () => {
    mockedGetContext.mockResolvedValue(null);

    await expect(ContractIssuePage({ params: Promise.resolve({ id: shootId }) })).rejects.toThrow(NOT_FOUND);
  });

  it("shows the shoot review using the shared money calculation", async () => {
    mockedGetContext.mockResolvedValue({
      shoot: { id: shootId, date: "2026-09-08", startTime: "14:00:00", locationName: "Estúdio", locationAddress: "Rua das Flores, 10", agreedPrice: "1200.00" },
      client: { id: "client-1", name: "Ana", phone: null, cpf: null, birthday: null, addressStreet: null, addressNumber: null, addressComplement: null, addressNeighborhood: null, addressCity: null, addressState: null, addressPostalCode: null },
      package: { name: "Retrato", description: null, durationMinutes: 60, includedPhotos: 20, scenes: null },
      payments: [{ amount: "400.00", status: "confirmado" }, { amount: "100.00", status: "pendente" }],
    });

    render(await ContractIssuePage({ params: Promise.resolve({ id: shootId }) }));

    expect(screen.getByText("Retrato")).toBeInTheDocument();
    expect(screen.getByText("08 set 2026 · 14:00")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.200,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 400,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 800,00")).toBeInTheDocument();
  });
});
