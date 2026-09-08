import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/domain/contracts/actions", () => ({ issueContractAction: vi.fn() }));

import { ContractIssuePanel } from "@/app/admin/(protected)/agenda/[id]/contrato/contract-issue-panel";

const shootId = "00000000-0000-4000-8000-000000000123";
const emptyCivilData = {
  cpf: null,
  birthday: null,
  addressStreet: null,
  addressNumber: null,
  addressComplement: null,
  addressNeighborhood: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
};

describe("ContractIssuePanel", () => {
  it("requires explicit image usage and hides download before issuance", () => {
    render(<ContractIssuePanel shootId={shootId} initialCivilData={emptyCivilData} />);

    expect(screen.getByRole("radio", { name: "Autorizo o uso de imagem" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Não autorizo o uso de imagem" })).not.toBeChecked();
    expect(screen.queryByRole("link", { name: /Baixar PDF/ })).not.toBeInTheDocument();
  });

  it("collects the exact civil fields required for issuance", () => {
    render(<ContractIssuePanel shootId={shootId} initialCivilData={emptyCivilData} />);

    for (const name of ["cpf", "birthday", "addressStreet", "addressNumber", "addressComplement", "addressNeighborhood", "addressCity", "addressState", "addressPostalCode", "imageUsage"]) {
      expect(document.querySelector(`[name=\"${name}\"]`)).toBeInTheDocument();
    }
    expect(document.querySelector('input[name="shootId"]')).toHaveValue(shootId);
  });
});
