// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  clients,
  experiencePackages,
  galleries,
  payments,
  shoots,
  upsellOrderItems,
  upsellOrders,
} from "@/db/schema";

// Live-DB tests are opt-in (RUN_LIVE_DB_TESTS=true), never armed by DATABASE_URL
// alone. They expect migration 0052 applied to a dev/staging project. The write
// test runs inside one transaction that is always rolled back, so it leaves no
// rows behind.
const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

class Rollback extends Error {}

describeIfLiveDb("upsell catalog and orders (live database)", () => {
  it("keeps the four upsell tables behind staff-only RLS", async () => {
    const rows = await db.execute(sql`
      select relname, relrowsecurity
      from pg_class
      where relname in ('upsell_products', 'gallery_upsell_offers', 'upsell_orders', 'upsell_order_items')
      order by relname
    `);
    expect(Array.from(rows)).toEqual([
      { relname: "gallery_upsell_offers", relrowsecurity: true },
      { relname: "upsell_order_items", relrowsecurity: true },
      { relname: "upsell_orders", relrowsecurity: true },
      { relname: "upsell_products", relrowsecurity: true },
    ]);

    const anonGrants = await db.execute(sql`
      select table_name
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'anon'
        and table_name in ('upsell_products', 'gallery_upsell_offers', 'upsell_orders', 'upsell_order_items')
    `);
    expect(Array.from(anonGrants)).toEqual([]);
  });

  it("links an order only to its client's shoot and gallery and payments only to the order's shoot", async () => {
    const outcome = await db
      .transaction(async (tx) => {
        const [pkg] = await tx.select({ id: experiencePackages.id }).from(experiencePackages).limit(1);
        const [owner] = await tx.insert(clients).values({ name: "Teste SCL-507 dona" }).returning();
        const [other] = await tx.insert(clients).values({ name: "Teste SCL-507 outra" }).returning();
        const [shoot] = await tx
          .insert(shoots)
          .values({ clientId: owner.id, experiencePackageId: pkg.id, shootDate: "2026-12-01", agreedPrice: "1000.00" })
          .returning();
        const [otherShoot] = await tx
          .insert(shoots)
          .values({ clientId: other.id, experiencePackageId: pkg.id, shootDate: "2026-12-02", agreedPrice: "1000.00" })
          .returning();
        const [gallery] = await tx.insert(galleries).values({ shootId: shoot.id }).returning();

        const foreignClient = await tx
          .transaction(async (sp) => {
            await sp.insert(upsellOrders).values({
              clientId: other.id,
              shootId: shoot.id,
              galleryId: gallery.id,
              total: "10.00",
              requestKey: crypto.randomUUID(),
            });
            return "inserted";
          })
          .catch((error: unknown) => String((error as { cause?: { message?: string } }).cause?.message ?? error));

        const [order] = await tx
          .insert(upsellOrders)
          .values({ clientId: owner.id, shootId: shoot.id, galleryId: gallery.id, total: "70.00", requestKey: crypto.randomUUID() })
          .returning();

        const badLine = await tx
          .transaction(async (sp) => {
            await sp.insert(upsellOrderItems).values({
              orderId: order.id,
              kind: "foto_adicional",
              name: "Foto adicional",
              unitPrice: "35.00",
              quantity: 2,
              lineTotal: "60.00",
            });
            return "inserted";
          })
          .catch(() => "rejected");

        const wrongShootPayment = await tx
          .transaction(async (sp) => {
            await sp.insert(payments).values({ shootId: otherShoot.id, upsellOrderId: order.id, amount: "70.00" });
            return "inserted";
          })
          .catch(() => "rejected");

        const [payment] = await tx
          .insert(payments)
          .values({ shootId: shoot.id, upsellOrderId: order.id, amount: "70.00", status: "confirmado" })
          .returning();

        throw new Rollback(JSON.stringify({ foreignClient, badLine, wrongShootPayment, paymentId: payment.id }));
      })
      .catch((error: unknown) => {
        if (error instanceof Rollback) return JSON.parse(error.message);
        throw error;
      });

    expect(outcome.foreignClient).toContain("upsell order shoot belongs to another client");
    expect(outcome.badLine).toBe("rejected");
    expect(outcome.wrongShootPayment).toBe("rejected");
    expect(outcome.paymentId).toEqual(expect.any(String));
  }, 30_000);
});
