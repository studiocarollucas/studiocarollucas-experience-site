CREATE TABLE "inventory_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"publishable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_media_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
ALTER TABLE "inventory_media" ADD CONSTRAINT "inventory_media_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_media_item_sort_idx" ON "inventory_media" USING btree ("inventory_item_id","sort_order","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_media_one_cover_per_item_idx" ON "inventory_media" USING btree ("inventory_item_id") WHERE "inventory_media"."is_cover" = true;--> statement-breakpoint
ALTER TABLE "inventory_media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "inventory_media" FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE "inventory_media" TO authenticated;--> statement-breakpoint
CREATE POLICY inventory_media_staff_access ON "inventory_media"
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-media', 'inventory-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;--> statement-breakpoint
DROP POLICY IF EXISTS inventory_media_objects_staff_access ON storage.objects;--> statement-breakpoint
CREATE POLICY inventory_media_objects_staff_access ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'inventory-media' AND public.is_staff_or_admin())
  WITH CHECK (bucket_id = 'inventory-media' AND public.is_staff_or_admin());
