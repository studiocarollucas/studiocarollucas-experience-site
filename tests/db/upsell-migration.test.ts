import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0052_upsell_catalog_orders.sql");
const snapshotPath = path.resolve("db/migrations/meta/0052_snapshot.json");
const previousSnapshotPath = path.resolve("db/migrations/meta/0051_snapshot.json");
const journalPath = path.resolve("db/migrations/meta/_journal.json");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
const normalizedSql = sql.toLowerCase().replace(/\s+/g, " ");

const upsellTables = ["upsell_products", "gallery_upsell_offers", "upsell_orders", "upsell_order_items"];

describe("upsell catalog and orders migration", () => {
  it("creates the product catalog with kinds as data and a non-negative decimal price", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(normalizedSql).toContain('create table "upsell_products"');
    expect(normalizedSql).toContain('"price" numeric(10, 2) not null');
    expect(normalizedSql).toContain('"internal_notes" text,');
    expect(normalizedSql).toContain('"active" boolean default true not null');
    expect(normalizedSql).toContain('"sort_order" integer default 0 not null');
    expect(normalizedSql).toContain('constraint "upsell_products_name_unique" unique("name")');
    expect(normalizedSql).toContain(
      'constraint "upsell_products_kind_valid" check ("upsell_products"."kind" in (\'foto_adicional\', \'colecao_completa\', \'album\', \'quadro\', \'reel_stories\', \'outro\'))',
    );
    expect(normalizedSql).toContain(
      'constraint "upsell_products_price_non_negative" check ("upsell_products"."price" >= 0)',
    );
  });

  it("enables offers per gallery once per product", () => {
    expect(normalizedSql).toContain('create table "gallery_upsell_offers"');
    expect(normalizedSql).toContain(
      'constraint "gallery_upsell_offers_gallery_product_unique" unique("gallery_id","product_id")',
    );
    expect(normalizedSql).toContain(
      'alter table "gallery_upsell_offers" add constraint "gallery_upsell_offers_gallery_id_galleries_id_fk" foreign key ("gallery_id") references "public"."galleries"("id") on delete cascade on update no action',
    );
    expect(normalizedSql).toContain(
      'alter table "gallery_upsell_offers" add constraint "gallery_upsell_offers_product_id_upsell_products_id_fk" foreign key ("product_id") references "public"."upsell_products"("id") on delete cascade on update no action',
    );
  });

  it("creates orders linked to client, shoot and gallery with a status separate from payment", () => {
    expect(normalizedSql).toContain(
      "create type \"public\".\"upsell_order_status\" as enum('solicitado', 'confirmado', 'em_producao', 'entregue', 'cancelado')",
    );
    expect(normalizedSql).toContain('create table "upsell_orders"');
    expect(normalizedSql).toContain('"status" "upsell_order_status" default \'solicitado\' not null');
    expect(normalizedSql).toContain('"total" numeric(10, 2) not null');
    expect(normalizedSql).toContain('"request_key" uuid not null');
    expect(normalizedSql).toContain(
      'constraint "upsell_orders_client_request_key_unique" unique("client_id","request_key")',
    );
    expect(normalizedSql).toContain('constraint "upsell_orders_id_shoot_unique" unique("id","shoot_id")');
    expect(normalizedSql).toContain('constraint "upsell_orders_total_non_negative" check ("upsell_orders"."total" >= 0)');
    for (const [column, table] of [
      ["client_id", "clients"],
      ["shoot_id", "shoots"],
      ["gallery_id", "galleries"],
    ]) {
      expect(normalizedSql).toContain(
        `alter table "upsell_orders" add constraint "upsell_orders_${column}_${table}_id_fk" foreign key ("${column}") references "public"."${table}"("id") on delete no action on update no action`,
      );
    }
    expect(normalizedSql).not.toMatch(/"upsell_orders_[a-z_]+_fk" foreign key \([^)]*\) references [^;]* on delete cascade/);
    expect(normalizedSql).toContain(
      "create trigger upsell_orders_consistent before insert or update of client_id, shoot_id, gallery_id on public.upsell_orders",
    );
    expect(normalizedSql).toContain("where shoots.id = new.shoot_id and shoots.client_id = new.client_id");
    expect(normalizedSql).toContain("where galleries.id = new.gallery_id and galleries.shoot_id = new.shoot_id");
    expect(normalizedSql).toContain("create or replace function private.upsell_orders_consistent()");
    expect(normalizedSql).toContain(
      "revoke all on function private.upsell_orders_consistent() from public, anon, authenticated;",
    );
  });

  it("snapshots item name, kind, price and quantity with a consistent line total", () => {
    expect(normalizedSql).toContain('create table "upsell_order_items"');
    expect(normalizedSql).toContain('"product_id" uuid,');
    expect(normalizedSql).toContain('"unit_price" numeric(10, 2) not null');
    expect(normalizedSql).toContain(
      'constraint "upsell_order_items_quantity_positive" check ("upsell_order_items"."quantity" > 0)',
    );
    expect(normalizedSql).toContain(
      'constraint "upsell_order_items_line_total_consistent" check ("upsell_order_items"."line_total" = "upsell_order_items"."unit_price" * "upsell_order_items"."quantity")',
    );
    expect(normalizedSql).toContain(
      'alter table "upsell_order_items" add constraint "upsell_order_items_order_id_upsell_orders_id_fk" foreign key ("order_id") references "public"."upsell_orders"("id") on delete cascade on update no action',
    );
    expect(normalizedSql).toContain(
      'alter table "upsell_order_items" add constraint "upsell_order_items_product_id_upsell_products_id_fk" foreign key ("product_id") references "public"."upsell_products"("id") on delete set null on update no action',
    );
  });

  it("links payments to an order on the same shoot and hides them from the portal shoot summary", () => {
    expect(normalizedSql).toContain('alter table "payments" add column "upsell_order_id" uuid;');
    expect(normalizedSql).toContain(
      'alter table "payments" add constraint "payments_upsell_order_fk" foreign key ("upsell_order_id","shoot_id") references "public"."upsell_orders"("id","shoot_id") on delete no action on update no action',
    );
    expect(normalizedSql).toContain('create index "payments_upsell_order_idx" on "payments" using btree ("upsell_order_id")');
    expect(normalizedSql).toContain("drop policy if exists payments_client_read on public.payments;");
    expect(normalizedSql).toContain(
      "create policy payments_client_read on public.payments for select to authenticated using (status = 'confirmado' and upsell_order_id is null and public.owns_portal_shoot(shoot_id));",
    );
  });

  it("limits every upsell table to staff/admin through RLS and grants nothing to anon", () => {
    for (const table of upsellTables) {
      expect(normalizedSql).toContain(`alter table public.${table} enable row level security;`);
      expect(normalizedSql).toContain(`revoke all on table public.${table} from anon, authenticated;`);
      expect(normalizedSql).toContain(`grant select, insert, update, delete on table public.${table} to authenticated;`);
      expect(normalizedSql).toContain(
        `create policy ${table}_staff_access on public.${table} for all to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());`,
      );
    }
    expect(normalizedSql).toContain("revoke all on type public.upsell_order_status from public, anon, authenticated;");
    expect(normalizedSql).toContain("grant usage on type public.upsell_order_status to authenticated, service_role;");
    expect(normalizedSql).not.toContain("to anon");
  });

  it("records the new tables, payment link and enum in the chained snapshot and journal", () => {
    expect(fs.existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const previous = JSON.parse(fs.readFileSync(previousSnapshotPath, "utf8"));
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

    expect(snapshot.prevId).toBe(previous.id);
    expect(snapshot.id).not.toBe(previous.id);
    expect(Object.keys(snapshot.tables)).toEqual([
      ...Object.keys(previous.tables),
      ...upsellTables.map((table) => `public.${table}`),
    ]);
    expect(snapshot.tables["public.galleries"]).toEqual(previous.tables["public.galleries"]);
    expect(Object.keys(snapshot.enums)).toEqual([...Object.keys(previous.enums), "public.upsell_order_status"]);
    expect(snapshot.enums["public.upsell_order_status"].values).toEqual([
      "solicitado",
      "confirmado",
      "em_producao",
      "entregue",
      "cancelado",
    ]);

    const payments = snapshot.tables["public.payments"];
    expect(Object.keys(payments.columns)).toEqual([...Object.keys(previous.tables["public.payments"].columns), "upsell_order_id"]);
    expect(payments.columns.upsell_order_id).toMatchObject({ type: "uuid", notNull: false });
    expect(payments.foreignKeys.payments_upsell_order_fk).toMatchObject({
      tableTo: "upsell_orders",
      columnsFrom: ["upsell_order_id", "shoot_id"],
      columnsTo: ["id", "shoot_id"],
    });

    const products = snapshot.tables["public.upsell_products"];
    expect(products.columns.price).toMatchObject({ type: "numeric(10, 2)", notNull: true });
    expect(products.columns.active).toMatchObject({ type: "boolean", default: true });
    expect(Object.keys(products.checkConstraints)).toEqual([
      "upsell_products_kind_valid",
      "upsell_products_price_non_negative",
    ]);

    const orders = snapshot.tables["public.upsell_orders"];
    expect(orders.columns.status).toMatchObject({
      type: "upsell_order_status",
      typeSchema: "public",
      notNull: true,
      default: "'solicitado'",
    });
    expect(Object.keys(orders.foreignKeys)).toEqual([
      "upsell_orders_client_id_clients_id_fk",
      "upsell_orders_shoot_id_shoots_id_fk",
      "upsell_orders_gallery_id_galleries_id_fk",
    ]);
    expect(orders.uniqueConstraints.upsell_orders_id_shoot_unique.columns).toEqual(["id", "shoot_id"]);

    const items = snapshot.tables["public.upsell_order_items"];
    expect(items.foreignKeys.upsell_order_items_product_id_upsell_products_id_fk.onDelete).toBe("set null");
    expect(Object.keys(items.checkConstraints)).toEqual([
      "upsell_order_items_kind_valid",
      "upsell_order_items_unit_price_non_negative",
      "upsell_order_items_quantity_positive",
      "upsell_order_items_line_total_consistent",
    ]);

    const position = journal.entries.findIndex((entry: { tag: string }) => entry.tag === "0052_upsell_catalog_orders");
    const entry = journal.entries[position];
    expect(entry).toMatchObject({ idx: 52, version: "7", tag: "0052_upsell_catalog_orders", breakpoints: true });
    expect(entry.when).toBeGreaterThan(journal.entries[position - 1].when);
  });
});
