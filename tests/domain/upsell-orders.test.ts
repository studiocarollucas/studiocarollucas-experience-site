// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/db/client", () => ({ db: { transaction: mocks.transaction, select: mocks.select } }));
vi.mock("@/domain/audit/service", () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import { payments, shoots } from "@/db/schema";
import { UpsellError } from "@/domain/upsell/errors";
import { changeUpsellOrderStatus, normalizeUpsellOrderStatusFilter } from "@/domain/upsell/orders";
import { registerUpsellPayment } from "@/domain/upsell/payments";

const ACTOR_ID = "00000000-0000-4000-8000-000000000801";
const ORDER_ID = "00000000-0000-4000-8000-000000000802";
const SHOOT_ID = "00000000-0000-4000-8000-000000000803";
const PAYMENT_ID = "00000000-0000-4000-8000-000000000804";

function chain(result: unknown) {
  const promise = Promise.resolve(result);
  const query: Record<string, unknown> = {};
  for (const method of ["from", "innerJoin", "leftJoin", "where", "limit", "for", "orderBy"]) {
    query[method] = vi.fn(() => query);
  }
  query.then = promise.then.bind(promise);
  return query;
}

function makeTx(selects: unknown[][], insertResult: unknown[] = []) {
  const queue = [...selects];
  const values = vi.fn(() => ({ returning: vi.fn().mockResolvedValue(insertResult) }));
  const set = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
  const tx = {
    select: vi.fn(() => chain(queue.shift() ?? [])),
    insert: vi.fn(() => ({ values })),
    update: vi.fn(() => ({ set })),
  };
  mocks.transaction.mockImplementation(async (operation: (tx: unknown) => unknown) => operation(tx));
  return { tx, values, set };
}

describe("changeUpsellOrderStatus", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  it("confirms a requested order and audits the transition in the transaction", async () => {
    const { tx, set } = makeTx([[{ id: ORDER_ID, status: "solicitado" }]]);

    await expect(changeUpsellOrderStatus({ orderId: ORDER_ID, status: "confirmado" }, ACTOR_ID)).resolves.toEqual({
      orderId: ORDER_ID,
      status: "confirmado",
      changed: true,
    });
    expect(set).toHaveBeenCalledWith({ status: "confirmado", updatedAt: expect.any(Date) });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      {
        actorUserId: ACTOR_ID,
        action: "upsell_order.status_changed",
        entityType: "upsell_order",
        entityId: ORDER_ID,
        before: { status: "solicitado" },
        after: { status: "confirmado" },
      },
      tx,
    );
  });

  it("treats the current status as a no-op without audit", async () => {
    const { tx } = makeTx([[{ id: ORDER_ID, status: "em_producao" }]]);

    await expect(changeUpsellOrderStatus({ orderId: ORDER_ID, status: "em_producao" }, ACTOR_ID)).resolves.toEqual({
      orderId: ORDER_ID,
      status: "em_producao",
      changed: false,
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects invalid transitions and unknown orders", async () => {
    makeTx([[{ id: ORDER_ID, status: "solicitado" }]]);
    await expect(changeUpsellOrderStatus({ orderId: ORDER_ID, status: "entregue" }, ACTOR_ID)).rejects.toThrow(
      new UpsellError('Não é possível passar o pedido de "Solicitado" para "Entregue".'),
    );

    makeTx([[{ id: ORDER_ID, status: "cancelado" }]]);
    await expect(changeUpsellOrderStatus({ orderId: ORDER_ID, status: "confirmado" }, ACTOR_ID)).rejects.toThrow(
      UpsellError,
    );

    makeTx([[]]);
    await expect(changeUpsellOrderStatus({ orderId: ORDER_ID, status: "confirmado" }, ACTOR_ID)).rejects.toThrow(
      new UpsellError("Pedido inexistente."),
    );
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("normalizes the Admin status filter", () => {
    expect(normalizeUpsellOrderStatusFilter("em_producao")).toBe("em_producao");
    expect(normalizeUpsellOrderStatusFilter("pago")).toBeUndefined();
    expect(normalizeUpsellOrderStatusFilter(undefined)).toBeUndefined();
  });
});

describe("registerUpsellPayment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordAuditEvent.mockResolvedValue({});
  });

  const order = { id: ORDER_ID, shootId: SHOOT_ID, status: "confirmado", total: "1000.00" };

  it("records a Payment on the order's Shoot, linked to the order, without touching the Shoot cache", async () => {
    const payment = {
      id: PAYMENT_ID,
      shootId: SHOOT_ID,
      upsellOrderId: ORDER_ID,
      amount: "600.00",
      status: "confirmado",
    };
    const { tx, values } = makeTx([[order], [{ amount: "400.00", status: "confirmado" }]], [payment]);

    const result = await registerUpsellPayment(
      { orderId: ORDER_ID, amount: "600.00", status: "confirmado", method: "Pix" },
      ACTOR_ID,
    );

    expect(tx.insert).toHaveBeenCalledWith(payments);
    expect(values).toHaveBeenCalledWith({
      amount: "600.00",
      status: "confirmado",
      method: "Pix",
      shootId: SHOOT_ID,
      upsellOrderId: ORDER_ID,
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalledWith(shoots);
    expect(result.money).toEqual({ paid: "1000.00", balance: "0.00", paymentStatus: "pago" });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: ACTOR_ID,
        action: "payment.registered",
        entityType: "payment",
        entityId: PAYMENT_ID,
        after: expect.objectContaining({ upsellOrderId: ORDER_ID, orderBalance: "0.00" }),
      }),
      tx,
    );
  });

  it("refuses payments before confirmation and on cancelled orders", async () => {
    makeTx([[{ ...order, status: "solicitado" }]]);
    await expect(registerUpsellPayment({ orderId: ORDER_ID, amount: "10.00" }, ACTOR_ID)).rejects.toThrow(
      new UpsellError("Confirme o pedido antes de registrar pagamentos."),
    );

    const { tx } = makeTx([[{ ...order, status: "cancelado" }]]);
    await expect(registerUpsellPayment({ orderId: ORDER_ID, amount: "10.00" }, ACTOR_ID)).rejects.toThrow(
      new UpsellError("Pedido cancelado não recebe pagamentos."),
    );
    expect(tx.insert).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("validates the amount like any Payment", async () => {
    await expect(registerUpsellPayment({ orderId: ORDER_ID, amount: "-5.00" }, ACTOR_ID)).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
