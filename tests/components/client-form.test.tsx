import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/domain/clients/actions", () => ({ updateClientAction: vi.fn() }));

import { ClientForm } from "@/components/admin/client-form";
import { EditClientForm } from "@/app/admin/(protected)/clientes/[id]/editar/edit-client-form";

const action = vi.fn(async () => ({ ok: true as const, data: { id: "client-1" } }));

describe("ClientForm", () => {
  it("renders contract fields only on the edit surface", () => {
    const { rerender } = render(<ClientForm action={action} initialValues={{ name: "Lia" }} />);
    expect(screen.queryByLabelText("CPF")).not.toBeInTheDocument();

    rerender(<ClientForm action={action} initialValues={{ name: "Lia" }} showContractFields />);
    expect(screen.getByLabelText("CEP")).toHaveAttribute("name", "addressPostalCode");
  });

  it("passes the edit-only contract flag through the edit wrapper", () => {
    render(
      <EditClientForm
        id="11111111-1111-4111-8111-111111111111"
        initialValues={{ name: "Lia" }}
        showContractFields
      />
    );

    expect(screen.getByLabelText("CPF")).toBeInTheDocument();
  });
});
