import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  listUpsellProducts: vi.fn(),
  createUpsellProduct: vi.fn(),
  updateUpsellProduct: vi.fn(),
  deleteUpsellProduct: vi.fn(),
  setGalleryUpsellOffers: vi.fn(),
  listUpsellOrders: vi.fn(),
  getUpsellOrderDetail: vi.fn(),
  changeUpsellOrderStatus: vi.fn(),
  registerUpsellPayment: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/domain/upsell/catalog", () => ({
  listUpsellProducts: mocks.listUpsellProducts,
  createUpsellProduct: mocks.createUpsellProduct,
  updateUpsellProduct: mocks.updateUpsellProduct,
  deleteUpsellProduct: mocks.deleteUpsellProduct,
  setGalleryUpsellOffers: mocks.setGalleryUpsellOffers,
}));
vi.mock("@/domain/upsell/orders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/domain/upsell/orders")>()),
  listUpsellOrders: mocks.listUpsellOrders,
  getUpsellOrderDetail: mocks.getUpsellOrderDetail,
  changeUpsellOrderStatus: mocks.changeUpsellOrderStatus,
}));
vi.mock("@/domain/upsell/payments", () => ({ registerUpsellPayment: mocks.registerUpsellPayment }));

import UpsellProductsPage from "@/app/admin/(protected)/upsells/page";
import UpsellOrdersPage from "@/app/admin/(protected)/upsells/pedidos/page";
import UpsellOrderPage from "@/app/admin/(protected)/upsells/pedidos/[id]/page";
import {
  changeUpsellOrderStatusAction,
  createUpsellProductAction,
  registerUpsellPaymentAction,
  setGalleryUpsellOffersAction,
} from "@/domain/upsell/actions";
import { UpsellError } from "@/domain/upsell/errors";

const ORDER_ID = "00000000-0000-4000-8000-000000000a01";
const CLIENT_ID = "00000000-0000-4000-8000-000000000a02";
const SHOOT_ID = "00000000-0000-4000-8000-000000000a03";
const GALLERY_ID = "00000000-0000-4000-8000-000000000a04";
const PRODUCT_ID = "00000000-0000-4000-8000-000000000a05";

const staff = { id: "00000000-0000-4000-8000-000000000a06", role: "staff" };

function orderDetail(status: string) {
  return {
    order: {
      id: ORDER_ID,
      clientId: CLIENT_ID,
      shootId: SHOOT_ID,
      galleryId: GALLERY_ID,
      status,
      total: "1310.00",
      clientNotes: "Capa clara",
      requestKey: "00000000-0000-4000-8000-000000000a07",
      createdAt: new Date("2026-09-26T13:00:00.000Z"),
      updatedAt: new Date("2026-09-26T13:00:00.000Z"),
    },
    clientName: "Mariana",
    shootDate: "2026-09-10",
    items: [
      {
        id: "00000000-0000-4000-8000-000000000a08",
        orderId: ORDER_ID,
        productId: null,
        kind: "foto_adicional",
        name: "Fotos extras da sessão",
        description: null,
        unitPrice: "35.00",
        quantity: 12,
        lineTotal: "420.00",
        createdAt: new Date("2026-09-26T13:00:00.000Z"),
      },
    ],
    payments: [],
    money: { paid: "0.00", balance: "1310.00", paymentStatus: "nao_iniciado" },
    nextStatuses: status === "solicitado" ? ["confirmado", "cancelado"] : ["em_producao", "entregue", "cancelado"],
  };
}

describe("Admin upsell pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(staff);
  });

  it("lists the catalog from data with kind, internal price and availability", async () => {
    mocks.listUpsellProducts.mockResolvedValue([
      {
        id: PRODUCT_ID,
        kind: "reel_stories",
        name: "Reel dos bastidores",
        description: null,
        internalNotes: "Editora parceira",
        price: "250.00",
        active: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    render(await UpsellProductsPage());

    const row = screen.getByRole("link", { name: "Reel dos bastidores" }).closest("tr")!;
    expect(within(row).getByText("Reel / Stories")).toBeInTheDocument();
    expect(within(row).getByText("R$ 250,00")).toBeInTheDocument();
    expect(within(row).getByText("Inativo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedidos" })).toHaveAttribute("href", "/admin/upsells/pedidos");
  });

  it("filters orders by a known status and shows order status apart from payment", async () => {
    mocks.listUpsellOrders.mockResolvedValue([
      {
        id: ORDER_ID,
        status: "confirmado",
        total: "1310.00",
        createdAt: new Date("2026-09-26T13:00:00.000Z"),
        clientId: CLIENT_ID,
        clientName: "Mariana",
        shootId: SHOOT_ID,
        shootDate: "2026-09-10",
        money: { paid: "400.00", balance: "910.00", paymentStatus: "parcial" },
      },
    ]);

    render(await UpsellOrdersPage({ searchParams: Promise.resolve({ status: "confirmado" }) }));

    expect(mocks.listUpsellOrders).toHaveBeenCalledWith({ status: "confirmado" });
    const row = screen.getByText("Mariana").closest("tr")!;
    expect(within(row).getByText("Confirmado")).toBeInTheDocument();
    expect(within(row).getByText("Pago em parte · saldo R$ 910,00")).toBeInTheDocument();
  });

  it("ignores unknown status filters", async () => {
    mocks.listUpsellOrders.mockResolvedValue([]);

    render(await UpsellOrdersPage({ searchParams: Promise.resolve({ status: "pago" }) }));

    expect(mocks.listUpsellOrders).toHaveBeenCalledWith({ status: undefined });
    expect(screen.getByText("Nenhum pedido")).toBeInTheDocument();
  });

  it("shows the snapshotted items and asks for confirmation before any payment", async () => {
    mocks.getUpsellOrderDetail.mockResolvedValue(orderDetail("solicitado"));

    render(await UpsellOrderPage({ params: Promise.resolve({ id: ORDER_ID }) }));

    expect(screen.getByText("Fotos extras da sessão")).toBeInTheDocument();
    expect(screen.getByText("Foto adicional")).toBeInTheDocument();
    expect(screen.getByText("R$ 420,00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar pedido" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar pedido" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar pagamento" })).not.toBeInTheDocument();
    expect(screen.getByText("Confirme o pedido para registrar pagamentos.")).toBeInTheDocument();
  });

  it("offers the payment form once the order is confirmed", async () => {
    mocks.getUpsellOrderDetail.mockResolvedValue(orderDetail("confirmado"));

    render(await UpsellOrderPage({ params: Promise.resolve({ id: ORDER_ID }) }));

    expect(screen.getByRole("button", { name: "Registrar pagamento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar produção" })).toBeInTheDocument();
  });
});

describe("Admin upsell actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(staff);
  });

  it("refuses catalog writes to client roles", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "client-user", role: "client" });

    const result = await createUpsellProductAction({ kind: "album", name: "Álbum", price: "890.00" });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.createUpsellProduct).not.toHaveBeenCalled();
  });

  it("creates a product with the staff member as actor", async () => {
    mocks.createUpsellProduct.mockResolvedValue({ id: PRODUCT_ID });

    await expect(createUpsellProductAction({ kind: "album", name: "Álbum", price: "890.00" })).resolves.toEqual({
      ok: true,
      data: { id: PRODUCT_ID },
    });
    expect(mocks.createUpsellProduct).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "album", name: "Álbum", price: "890.00", active: true }),
      staff.id,
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/upsells");
  });

  it("saves the gallery offers and revalidates the gallery workspace", async () => {
    mocks.setGalleryUpsellOffers.mockResolvedValue({ galleryId: GALLERY_ID, productIds: [PRODUCT_ID], changed: true });

    const result = await setGalleryUpsellOffersAction({ galleryId: GALLERY_ID, shootId: SHOOT_ID, productIds: [PRODUCT_ID] });

    expect(result).toMatchObject({ ok: true });
    expect(mocks.setGalleryUpsellOffers).toHaveBeenCalledWith({ galleryId: GALLERY_ID, productIds: [PRODUCT_ID] }, staff.id);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/galerias/${SHOOT_ID}`);
  });

  it("shows transition errors to staff as actionable messages", async () => {
    mocks.changeUpsellOrderStatus.mockRejectedValue(
      new UpsellError('Não é possível passar o pedido de "Solicitado" para "Entregue".'),
    );

    await expect(changeUpsellOrderStatusAction({ orderId: ORDER_ID, status: "entregue" })).resolves.toEqual({
      ok: false,
      error: 'Não é possível passar o pedido de "Solicitado" para "Entregue".',
    });
  });

  it("registers an order payment and refreshes the order, the shoot and the ledger", async () => {
    mocks.registerUpsellPayment.mockResolvedValue({
      payment: { id: "payment-1" },
      orderId: ORDER_ID,
      shootId: SHOOT_ID,
      money: { paid: "1310.00", balance: "0.00", paymentStatus: "pago" },
    });

    await expect(
      registerUpsellPaymentAction({ orderId: ORDER_ID, amount: "1310.00", status: "confirmado" }),
    ).resolves.toEqual({ ok: true, data: { orderId: ORDER_ID, balance: "0.00", paymentStatus: "pago" } });
    expect(mocks.registerUpsellPayment).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: ORDER_ID, amount: "1310.00", status: "confirmado" }),
      staff.id,
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/upsells/pedidos/${ORDER_ID}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/agenda/${SHOOT_ID}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/financeiro");
  });
});
