import { describe, expect, it } from "vitest";
import { UpsellError } from "@/domain/upsell/errors";
import {
  canTransitionUpsellOrder,
  quoteUpsellOrder,
  suggestExtraPhotos,
  summarizeUpsellOrderMoney,
  upsellOrderAcceptsPayments,
  upsellOrderNextStatuses,
  type OfferedUpsellProduct,
} from "@/domain/upsell/rules";

const PHOTO = "00000000-0000-4000-8000-000000000501";
const ALBUM = "00000000-0000-4000-8000-000000000502";
const COLLECTION = "00000000-0000-4000-8000-000000000503";
const NOT_OFFERED = "00000000-0000-4000-8000-000000000504";

const offers: OfferedUpsellProduct[] = [
  { productId: PHOTO, kind: "foto_adicional", name: "Foto adicional", description: null, price: "35.00" },
  { productId: ALBUM, kind: "album", name: "Álbum 20x30", description: "Capa em linho", price: "890.50" },
  { productId: COLLECTION, kind: "colecao_completa", name: "Coleção completa", description: null, price: "1200.00" },
];

function quoteError(items: { productId: string; quantity: number }[]) {
  try {
    quoteUpsellOrder(offers, items);
  } catch (error) {
    return error;
  }
  return null;
}

describe("quoteUpsellOrder", () => {
  it("prices every line from the server-side offer and snapshots name, kind and description", () => {
    const quote = quoteUpsellOrder(offers, [
      { productId: PHOTO, quantity: 12 },
      { productId: ALBUM, quantity: 2 },
    ]);

    expect(quote.items).toEqual([
      {
        productId: PHOTO,
        kind: "foto_adicional",
        name: "Foto adicional",
        description: null,
        unitPrice: "35.00",
        quantity: 12,
        lineTotal: "420.00",
      },
      {
        productId: ALBUM,
        kind: "album",
        name: "Álbum 20x30",
        description: "Capa em linho",
        unitPrice: "890.50",
        quantity: 2,
        lineTotal: "1781.00",
      },
    ]);
    expect(quote.total).toBe("2201.00");
  });

  it("rejects products that are not offered (or inactive) for the gallery", () => {
    const error = quoteError([{ productId: NOT_OFFERED, quantity: 1 }]);
    expect(error).toBeInstanceOf(UpsellError);
    expect((error as Error).message).toBe("Este produto não está disponível na sua galeria.");
  });

  it("rejects empty orders, repeated products and invalid quantities", () => {
    expect((quoteError([]) as Error).message).toBe("Escolha ao menos um produto.");
    expect(
      (quoteError([
        { productId: PHOTO, quantity: 1 },
        { productId: PHOTO, quantity: 2 },
      ]) as Error).message,
    ).toBe("Cada produto só pode aparecer uma vez no pedido.");
    for (const quantity of [0, -1, 1.5, 100]) {
      expect((quoteError([{ productId: PHOTO, quantity }]) as Error).message).toBe("Quantidade inválida.");
    }
  });

  it("only accepts the complete collection once", () => {
    expect((quoteError([{ productId: COLLECTION, quantity: 2 }]) as Error).message).toBe(
      "A coleção completa é pedida uma única vez.",
    );
    expect(quoteUpsellOrder(offers, [{ productId: COLLECTION, quantity: 1 }]).total).toBe("1200.00");
  });
});

describe("upsell order transitions", () => {
  it("moves forward from solicitado to entregue and can be cancelled until delivery", () => {
    expect(canTransitionUpsellOrder("solicitado", "confirmado")).toBe(true);
    expect(canTransitionUpsellOrder("confirmado", "em_producao")).toBe(true);
    expect(canTransitionUpsellOrder("em_producao", "entregue")).toBe(true);
    expect(canTransitionUpsellOrder("confirmado", "entregue")).toBe(true);
    for (const from of ["solicitado", "confirmado", "em_producao"] as const) {
      expect(canTransitionUpsellOrder(from, "cancelado")).toBe(true);
    }
  });

  it("never skips confirmation, goes backwards or leaves a terminal status", () => {
    expect(canTransitionUpsellOrder("solicitado", "em_producao")).toBe(false);
    expect(canTransitionUpsellOrder("solicitado", "entregue")).toBe(false);
    expect(canTransitionUpsellOrder("em_producao", "confirmado")).toBe(false);
    expect(canTransitionUpsellOrder("confirmado", "confirmado")).toBe(false);
    expect(upsellOrderNextStatuses("entregue")).toEqual([]);
    expect(upsellOrderNextStatuses("cancelado")).toEqual([]);
  });

  it("accepts payments only once the studio confirmed the order", () => {
    expect(upsellOrderAcceptsPayments("solicitado")).toBe(false);
    expect(upsellOrderAcceptsPayments("confirmado")).toBe(true);
    expect(upsellOrderAcceptsPayments("em_producao")).toBe(true);
    expect(upsellOrderAcceptsPayments("entregue")).toBe(true);
    expect(upsellOrderAcceptsPayments("cancelado")).toBe(false);
  });
});

describe("summarizeUpsellOrderMoney", () => {
  it("derives paid, balance and payment status from confirmed payments only", () => {
    expect(
      summarizeUpsellOrderMoney("1000.00", [
        { amount: "400.00", status: "confirmado" },
        { amount: "300.00", status: "pendente" },
        { amount: "600.00", status: "estornado" },
      ]),
    ).toEqual({ paid: "400.00", balance: "600.00", paymentStatus: "parcial" });
    expect(summarizeUpsellOrderMoney("1000.00", [])).toEqual({
      paid: "0.00",
      balance: "1000.00",
      paymentStatus: "nao_iniciado",
    });
    expect(summarizeUpsellOrderMoney("1000.00", [{ amount: "1000.00", status: "confirmado" }])).toEqual({
      paid: "1000.00",
      balance: "0.00",
      paymentStatus: "pago",
    });
  });
});

describe("suggestExtraPhotos", () => {
  it("suggests the favorites beyond the photos included in the package", () => {
    expect(suggestExtraPhotos(32, 20)).toBe(12);
    expect(suggestExtraPhotos(15, 20)).toBe(0);
    expect(suggestExtraPhotos(15, null)).toBe(0);
  });
});
