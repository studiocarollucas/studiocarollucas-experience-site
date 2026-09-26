CREATE TYPE "public"."upsell_order_status" AS ENUM('solicitado', 'confirmado', 'em_producao', 'entregue', 'cancelado');--> statement-breakpoint
CREATE TABLE "upsell_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"internal_notes" text,
	"price" numeric(10, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upsell_products_name_unique" UNIQUE("name"),
	CONSTRAINT "upsell_products_kind_valid" CHECK ("upsell_products"."kind" in ('foto_adicional', 'colecao_completa', 'album', 'quadro', 'reel_stories', 'outro')),
	CONSTRAINT "upsell_products_price_non_negative" CHECK ("upsell_products"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "gallery_upsell_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_upsell_offers_gallery_product_unique" UNIQUE("gallery_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "upsell_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"shoot_id" uuid NOT NULL,
	"gallery_id" uuid NOT NULL,
	"status" "upsell_order_status" DEFAULT 'solicitado' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"client_notes" text,
	"request_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upsell_orders_client_request_key_unique" UNIQUE("client_id","request_key"),
	CONSTRAINT "upsell_orders_id_shoot_unique" UNIQUE("id","shoot_id"),
	CONSTRAINT "upsell_orders_total_non_negative" CHECK ("upsell_orders"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "upsell_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit_price" numeric(10, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upsell_order_items_order_product_unique" UNIQUE("order_id","product_id"),
	CONSTRAINT "upsell_order_items_kind_valid" CHECK ("upsell_order_items"."kind" in ('foto_adicional', 'colecao_completa', 'album', 'quadro', 'reel_stories', 'outro')),
	CONSTRAINT "upsell_order_items_unit_price_non_negative" CHECK ("upsell_order_items"."unit_price" >= 0),
	CONSTRAINT "upsell_order_items_quantity_positive" CHECK ("upsell_order_items"."quantity" > 0),
	CONSTRAINT "upsell_order_items_line_total_consistent" CHECK ("upsell_order_items"."line_total" = "upsell_order_items"."unit_price" * "upsell_order_items"."quantity")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "upsell_order_id" uuid;--> statement-breakpoint
ALTER TABLE "gallery_upsell_offers" ADD CONSTRAINT "gallery_upsell_offers_gallery_id_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_upsell_offers" ADD CONSTRAINT "gallery_upsell_offers_product_id_upsell_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."upsell_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_orders" ADD CONSTRAINT "upsell_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_orders" ADD CONSTRAINT "upsell_orders_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_orders" ADD CONSTRAINT "upsell_orders_gallery_id_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."galleries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_order_items" ADD CONSTRAINT "upsell_order_items_order_id_upsell_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."upsell_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_order_items" ADD CONSTRAINT "upsell_order_items_product_id_upsell_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."upsell_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_upsell_order_fk" FOREIGN KEY ("upsell_order_id","shoot_id") REFERENCES "public"."upsell_orders"("id","shoot_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_upsell_offers_product_idx" ON "gallery_upsell_offers" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "upsell_orders_shoot_idx" ON "upsell_orders" USING btree ("shoot_id");--> statement-breakpoint
CREATE INDEX "upsell_orders_status_created_idx" ON "upsell_orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payments_upsell_order_idx" ON "payments" USING btree ("upsell_order_id");
--> statement-breakpoint
-- Hand-written (SCL-507): an order's Client, Shoot and Gallery must agree —
-- the Shoot belongs to the Client and the Gallery belongs to the Shoot.
create or replace function private.upsell_orders_consistent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.shoots
    where shoots.id = new.shoot_id
      and shoots.client_id = new.client_id
  ) then
    raise exception 'upsell order shoot belongs to another client'
      using errcode = 'check_violation', constraint = 'upsell_orders_consistent';
  end if;
  if not exists (
    select 1
    from public.galleries
    where galleries.id = new.gallery_id
      and galleries.shoot_id = new.shoot_id
  ) then
    raise exception 'upsell order gallery belongs to another shoot'
      using errcode = 'check_violation', constraint = 'upsell_orders_consistent';
  end if;
  return new;
end;
$$;
revoke all on function private.upsell_orders_consistent()
  from public, anon, authenticated;
--> statement-breakpoint
create trigger upsell_orders_consistent
before insert or update of client_id, shoot_id, gallery_id on public.upsell_orders
for each row execute function private.upsell_orders_consistent();
--> statement-breakpoint
-- Upsell receipts are paid against the order, not the Shoot's agreed price, so
-- the portal's Shoot money summary (read through the Data API under this
-- policy) must not count them. Same policy as 0025 plus the upsell filter.
drop policy if exists payments_client_read on public.payments;
create policy payments_client_read on public.payments
for select to authenticated
using (status = 'confirmado' and upsell_order_id is null and public.owns_portal_shoot(shoot_id));
--> statement-breakpoint
-- Staff/admin only through the Data API, like galleries/reviews (0036/0051).
-- Nothing for anon; the client portal reads offers and writes orders only
-- through server-side domain code after resolving the client from the session.
alter table public.upsell_products enable row level security;
alter table public.gallery_upsell_offers enable row level security;
alter table public.upsell_orders enable row level security;
alter table public.upsell_order_items enable row level security;
revoke all on table public.upsell_products from anon, authenticated;
revoke all on table public.gallery_upsell_offers from anon, authenticated;
revoke all on table public.upsell_orders from anon, authenticated;
revoke all on table public.upsell_order_items from anon, authenticated;
revoke all on type public.upsell_order_status from public, anon, authenticated;
grant usage on type public.upsell_order_status to authenticated, service_role;
grant select, insert, update, delete on table public.upsell_products to authenticated;
grant select, insert, update, delete on table public.gallery_upsell_offers to authenticated;
grant select, insert, update, delete on table public.upsell_orders to authenticated;
grant select, insert, update, delete on table public.upsell_order_items to authenticated;
create policy upsell_products_staff_access on public.upsell_products
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
create policy gallery_upsell_offers_staff_access on public.gallery_upsell_offers
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
create policy upsell_orders_staff_access on public.upsell_orders
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
create policy upsell_order_items_staff_access on public.upsell_order_items
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
