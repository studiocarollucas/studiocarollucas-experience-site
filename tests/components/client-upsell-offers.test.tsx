import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requestUpsellOrderAction: vi.fn() }));

vi.mock("@/app/(client)/minha-experiencia/galeria/upsell-actions", () => ({
  requestUpsellOrderAction: mocks.requestUpsellOrderAction,
}));

import { ClientUpsellOffers, type ClientUpsellOfferView } from "@/components/client/upsell-offers";

const GALLERY_ID = "00000000-0000-4000-8000-000000000d01";
const REQUEST_KEY = "00000000-0000-4000-8000-000000000d02";
const PHOTO = "00000000-0000-4000-8000-000000000d03";
const COLLECTION = "00000000-0000-4000-8000-000000000d04";
const ALBUM = "00000000-0000-4000-8000-000000000d05";

const offers: ClientUpsellOfferView[] = [
  { productId: PHOTO, kind: "foto_adicional", name: "Foto adicional", description: null, price: "35.00" },
  { productId: COLLECTION, kind: "colecao_completa", name: "Coleção completa", description: null, price: "1200.00" },
  { productId: ALBUM, kind: "album", name: "Álbum 20x30", description: "Capa em linho", price: "890.00" },
];

function renderOffers(suggestedExtraPhotos = 0) {
  return render(
    <ClientUpsellOffers
      galleryId={GALLERY_ID}
      requestKey={REQUEST_KEY}
      offers={offers}
      favoritesCount={suggestedExtraPhotos + 20}
      suggestedExtraPhotos={suggestedExtraPhotos}
    />,
  );
}

describe("ClientUpsellOffers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the catalog data it receives and prefills extra photos from favorites", () => {
    renderOffers(4);

    expect(screen.getByText("Álbum 20x30")).toBeInTheDocument();
    expect(screen.getByText("Capa em linho")).toBeInTheDocument();
    expect(screen.getByText("R$ 890,00")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade de Foto adicional")).toHaveValue(4);
    expect(screen.getByText(/Valor estimado: R\$ 140,00/)).toBeInTheDocument();
  });

  it("sends only product ids, quantities and the form's request key", async () => {
    mocks.requestUpsellOrderAction.mockResolvedValue({ ok: true, data: { orderId: "order-1", created: true } });
    renderOffers(2);

    fireEvent.change(screen.getByLabelText("Quantidade de Álbum 20x30"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Quero a Coleção completa" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Capa clara" } });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar pedido" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Pedido enviado!"));
    expect(mocks.requestUpsellOrderAction).toHaveBeenCalledWith({
      galleryId: GALLERY_ID,
      requestKey: REQUEST_KEY,
      items: [
        { productId: PHOTO, quantity: 2 },
        { productId: COLLECTION, quantity: 1 },
        { productId: ALBUM, quantity: 1 },
      ],
      notes: "Capa clara",
    });
  });

  it("keeps the choice and shows the error when the request fails", async () => {
    mocks.requestUpsellOrderAction.mockResolvedValue({
      ok: false,
      error: "Este produto não está disponível na sua galeria.",
    });
    renderOffers(1);

    fireEvent.click(screen.getByRole("button", { name: "Solicitar pedido" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Este produto não está disponível na sua galeria."),
    );
    expect(screen.getByLabelText("Quantidade de Foto adicional")).toHaveValue(1);
  });

  it("cannot submit an empty order", () => {
    renderOffers(0);

    expect(screen.getByRole("button", { name: "Solicitar pedido" })).toBeDisabled();
    expect(screen.getByText("Escolha ao menos um produto.")).toBeInTheDocument();
  });
});
