CREATE TYPE "public"."inventory_item_status" AS ENUM('available', 'maintenance', 'retired');--> statement-breakpoint
CREATE TYPE "public"."inventory_item_type" AS ENUM('outfit', 'clutch', 'accessory', 'prop');--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "inventory_item_type" NOT NULL,
	"color" text,
	"size" text,
	"status" "inventory_item_status" DEFAULT 'available' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"internal_price" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "inventory_items" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TYPE public.inventory_item_type FROM public, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TYPE public.inventory_item_status FROM public, anon, authenticated;
--> statement-breakpoint
GRANT USAGE ON TYPE public.inventory_item_type TO authenticated, service_role;
--> statement-breakpoint
GRANT USAGE ON TYPE public.inventory_item_status TO authenticated, service_role;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "inventory_items" TO authenticated;
--> statement-breakpoint
CREATE POLICY inventory_items_staff_access ON "inventory_items"
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());
