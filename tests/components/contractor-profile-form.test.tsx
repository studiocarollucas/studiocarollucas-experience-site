import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  saveContractorProfileAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/domain/contractor-profile/actions", () => ({
  saveContractorProfileAction: mocks.saveContractorProfileAction,
}));

import { ContractorProfileForm } from "@/app/admin/(protected)/configuracoes/contratante/contractor-profile-form";

describe("ContractorProfileForm", () => {
  it("refreshes the route and confirms after saving the profile", async () => {
    mocks.saveContractorProfileAction.mockResolvedValueOnce({ ok: true, data: { id: "profile-1" } });
    const { container } = render(
      <ContractorProfileForm
        initialProfile={{
          personType: "individual",
          legalName: "Carol Lucas",
          document: "11144477735",
          address: "Rua das Flores, 10",
        }}
      />,
    );

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mocks.saveContractorProfileAction).toHaveBeenCalledWith({
        personType: "individual",
        legalName: "Carol Lucas",
        document: "11144477735",
        address: "Rua das Flores, 10",
      });
      expect(mocks.refresh).toHaveBeenCalledOnce();
    });
    expect(screen.getByText("Dados da contratante salvos.")).toBeInTheDocument();
  });

  it("renders a prefilled individual contractor profile", () => {
    render(
      <ContractorProfileForm
        initialProfile={{
          personType: "individual",
          legalName: "Carol Lucas",
          document: "11144477735",
          address: "Rua das Flores, 10",
        }}
      />,
    );

    expect(screen.getByLabelText("Nome completo")).toHaveValue("Carol Lucas");
    expect(screen.getByLabelText("CPF")).toHaveValue("11144477735");
    expect(screen.getByLabelText("Endereço")).toHaveValue("Rua das Flores, 10");
  });

  it("renders company labels and saved values for a company contractor", () => {
    render(
      <ContractorProfileForm
        initialProfile={{
          personType: "company",
          legalName: "Studio Carol Lucas LTDA",
          document: "04252011000111",
          address: "Av. Brasil, 100",
        }}
      />,
    );

    expect(screen.getByLabelText("Razão social")).toHaveValue("Studio Carol Lucas LTDA");
    expect(screen.getByLabelText("CNPJ")).toHaveValue("04252011000111");
  });

  it("changes the labels when the person type changes", () => {
    render(<ContractorProfileForm initialProfile={null} />);

    fireEvent.change(screen.getByLabelText("Tipo de pessoa"), { target: { value: "company" } });

    expect(screen.getByLabelText("Razão social")).toBeInTheDocument();
    expect(screen.getByLabelText("CNPJ")).toBeInTheDocument();
  });
});
