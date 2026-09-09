CREATE TYPE "public"."inventory_reservation_purpose" AS ENUM('shoot', 'rental');--> statement-breakpoint
CREATE TYPE "public"."inventory_reservation_status" AS ENUM('pending', 'confirmed', 'cancelled', 'released');--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"shoot_id" uuid NOT NULL,
	"purpose" "inventory_reservation_purpose" DEFAULT 'shoot' NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"status" "inventory_reservation_status" DEFAULT 'pending' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_user_id" uuid,
	"override_reason" text,
	"overridden_by_user_id" uuid,
	"overridden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_reservations_dates_valid" CHECK ("inventory_reservations"."ends_on" >= "inventory_reservations"."starts_on")
);
--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_cancelled_by_user_id_profiles_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_overridden_by_user_id_profiles_id_fk" FOREIGN KEY ("overridden_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_reservations_blocking_item_dates_idx" ON "inventory_reservations" USING btree ("inventory_item_id","starts_on","ends_on") WHERE "inventory_reservations"."status" in ('pending', 'confirmed');
--> statement-breakpoint
ALTER TABLE "inventory_reservations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "inventory_reservations" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TYPE public.inventory_reservation_purpose FROM public, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TYPE public.inventory_reservation_status FROM public, anon, authenticated;
--> statement-breakpoint
GRANT USAGE ON TYPE public.inventory_reservation_purpose TO authenticated, service_role;
--> statement-breakpoint
GRANT USAGE ON TYPE public.inventory_reservation_status TO authenticated, service_role;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "inventory_reservations" TO authenticated;
--> statement-breakpoint
CREATE POLICY inventory_reservations_staff_access ON "inventory_reservations"
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());
