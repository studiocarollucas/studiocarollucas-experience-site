import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setInventoryPreferenceAction: vi.fn() }));

vi.mock("@/app/(client)/minha-experiencia/styling/actions", () => ({
  setInventoryPreferenceAction: mocks.setInventoryPreferenceAction,
}));

import { ClientInventorySelection } from "@/components/client/inventory-selection";
import type { PortalInventorySelection } from "@/domain/inventory/portal-selection-rules";

const photo = (id: string) => ({ id, signedUrl: `https://signed.example/${id}?token=t` });

function selection(overrides: Partial<PortalInventorySelection> = {}): PortalInventorySelection {
  return {
    selectionOpen: true,
    limits: { outfit: 2, clutch: 1 },
    used: { outfit: 1, clutch: 0 },
    shootItems: [
      {
        id: "item-preferred",
        name: "Vestido rosé",
        type: "outfit",
        color: "rosé",
        size: "M",
        photos: [photo("m1")],
        availability: "preferred",
      },
    ],
    catalog: [
      {
        id: "item-free",
        name: "Vestido azul",
        type: "outfit",
        color: "azul",
        size: "P",
        photos: [photo("m2"), photo("m3")],
        availability: "available",
      },
      {
        id: "item-busy",
        name: "Clutch dourada",
        type: "clutch",
        color: "dourado",
        size: null,
        photos: [],
        availability: "unavailable",
      },
    ],
    ...overrides,
  };
}

describe("ClientInventorySelection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("distinguishes preference, confirmed reservation and unavailability with photos and details", () => {
    render(
      <ClientInventorySelection
        selection={selection({
          shootItems: [
            ...selection().shootItems,
            {
              id: "item-reserved",
              name: "Vestido longo",
              type: "outfit",
              color: null,
              size: null,
              photos: [],
              availability: "reserved",
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Sua preferência · aguardando confirmação do estúdio")).toBeInTheDocument();
    expect(screen.getByText("Reservada para o seu ensaio")).toBeInTheDocument();
    expect(screen.getByText("Figurinos: 1 de 2 · Clutch: 0 de 1")).toBeInTheDocument();
    expect(screen.getByAltText("Vestido azul — foto 1")).toHaveAttribute("src", expect.stringContaining("token="));
    expect(screen.getByAltText("Vestido azul — foto 2")).toBeInTheDocument();
    expect(screen.getByText("Figurino · Cor: azul · Tamanho: P")).toBeInTheDocument();
    expect(screen.getByText("Indisponível na data do seu ensaio")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Marcar como preferência: Clutch dourada" }),
    ).not.toBeInTheDocument();
  });

  it("sends only the item and the desired state to the server", async () => {
    mocks.setInventoryPreferenceAction.mockResolvedValue({
      ok: true,
      data: { inventoryItemId: "item-free", state: "preferred" },
    });
    render(<ClientInventorySelection selection={selection()} />);

    fireEvent.click(screen.getByRole("button", { name: "Marcar como preferência: Vestido azul" }));

    await waitFor(() =>
      expect(mocks.setInventoryPreferenceAction).toHaveBeenCalledWith({
        inventoryItemId: "item-free",
        preferred: true,
      }),
    );
  });

  it("withdraws a pending preference and shows the server's refusal", async () => {
    mocks.setInventoryPreferenceAction.mockResolvedValue({
      ok: false,
      error: "Esta peça já foi confirmada pelo estúdio. Fale com a equipe para alterar.",
    });
    render(<ClientInventorySelection selection={selection()} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover preferência: Vestido rosé" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/já foi confirmada pelo estúdio/);
    expect(mocks.setInventoryPreferenceAction).toHaveBeenCalledWith({
      inventoryItemId: "item-preferred",
      preferred: false,
    });
  });

  it("blocks new choices of a type once the package limit is reached", () => {
    render(<ClientInventorySelection selection={selection({ used: { outfit: 2, clutch: 0 } })} />);

    expect(screen.getByText(/atingiu o limite do seu pacote/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como preferência: Vestido azul" })).toBeDisabled();
  });

  it("hides the catalog once selection is closed and keeps the shoot's pieces", () => {
    render(<ClientInventorySelection selection={selection({ selectionOpen: false })} />);

    expect(screen.getByText(/escolha de peças está encerrada/)).toBeInTheDocument();
    expect(screen.getByText("Vestido rosé")).toBeInTheDocument();
    expect(screen.queryByText("Vestido azul")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remover preferência/ })).not.toBeInTheDocument();
  });
});
