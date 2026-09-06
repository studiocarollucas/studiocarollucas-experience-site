import { describe, it, expect } from "vitest";
import { planPaymentStatusUpdate } from "@/domain/payments/register-payment";

describe("planPaymentStatusUpdate", () => {
  it("stays nao_iniciado when the new payment is only pendente", () => {
    const r = planPaymentStatusUpdate("1000.00", [], { amount: "400.00", status: "pendente" });
    expect(r).toEqual({ nextStatus: "nao_iniciado", nextBalance: "1000.00" });
  });

  it("becomes parcial when a confirmed payment covers part of the agreed price", () => {
    const r = planPaymentStatusUpdate("1000.00", [], { amount: "400.00", status: "confirmado" });
    expect(r).toEqual({ nextStatus: "parcial", nextBalance: "600.00" });
  });

  it("becomes pago when confirmed payments reach the agreed price", () => {
    const r = planPaymentStatusUpdate(
      "1000.00",
      [{ amount: "600.00", status: "confirmado" }],
      { amount: "400.00", status: "confirmado" },
    );
    expect(r).toEqual({ nextStatus: "pago", nextBalance: "0.00" });
  });

  it("reports a negative balance on overpayment without clamping", () => {
    const r = planPaymentStatusUpdate(
      "1000.00",
      [{ amount: "800.00", status: "confirmado" }],
      { amount: "400.00", status: "confirmado" },
    );
    expect(r).toEqual({ nextStatus: "pago", nextBalance: "-200.00" });
  });

  it("ignores estornado rows in both existing and new", () => {
    const r = planPaymentStatusUpdate(
      "1000.00",
      [{ amount: "1000.00", status: "estornado" }],
      { amount: "1000.00", status: "estornado" },
    );
    expect(r).toEqual({ nextStatus: "nao_iniciado", nextBalance: "1000.00" });
  });
});

import { afterAll, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { payments, shoots, clients, experiencePackages } from "@/db/schema";
import { registerPayment } from "@/domain/payments/register-payment";

const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("registerPayment (integration)", () => {
  let clientId: string;
  let shootId: string;

  beforeAll(async () => {
    const [c] = await db.insert(clients).values({ name: "Teste Epic2 SCL-220" }).returning();
    clientId = c.id;
    const [p] = await db.select({ id: experiencePackages.id }).from(experiencePackages).limit(1);
    const [s] = await db
      .insert(shoots)
      .values({ clientId, experiencePackageId: p.id, shootDate: "2026-12-01", agreedPrice: "1000.00" })
      .returning();
    shootId = s.id;
  });

  afterAll(async () => {
    await db.delete(payments).where(eq(payments.shootId, shootId));
    await db.delete(shoots).where(eq(shoots.id, shootId));
    await db.delete(clients).where(eq(clients.id, clientId));
  });

  it(
    "writes the payment and updates shoots.payment_status to the derived value",
    async () => {
      const r1 = await registerPayment({ shootId, amount: "400.00", status: "confirmado" });
      expect(r1.shootPaymentStatus).toBe("parcial");
      expect(r1.balance).toBe("600.00");

      const [afterFirst] = await db
        .select({ ps: shoots.paymentStatus })
        .from(shoots)
        .where(eq(shoots.id, shootId));
      expect(afterFirst.ps).toBe("parcial");

      const r2 = await registerPayment({ shootId, amount: "600.00", status: "confirmado" });
      expect(r2.shootPaymentStatus).toBe("pago");
      expect(r2.balance).toBe("0.00");
    },
    // Each registerPayment runs a multi-round-trip db.transaction against the
    // remote Supabase pooler; two of them comfortably exceed vitest's 5s default.
    30_000,
  );
});
