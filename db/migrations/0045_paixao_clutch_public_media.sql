CREATE TABLE "inventory_public_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"source_media_id" uuid,
	"storage_path" text NOT NULL,
	"public_path" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_public_media_storage_path_unique" UNIQUE("storage_path"),
	CONSTRAINT "inventory_public_media_public_path_unique" UNIQUE("public_path"),
	CONSTRAINT "inventory_public_media_state_valid" CHECK ("inventory_public_media"."state" in ('pending', 'ready', 'deleting')),
	CONSTRAINT "inventory_public_media_file_valid" CHECK ("inventory_public_media"."size_bytes" > 0 and "inventory_public_media"."size_bytes" <= 4194304 and "inventory_public_media"."content_type" in ('image/jpeg', 'image/png', 'image/webp'))
);
--> statement-breakpoint
ALTER TABLE "inventory_public_media" ADD CONSTRAINT "inventory_public_media_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_public_media" ADD CONSTRAINT "inventory_public_media_source_media_id_inventory_media_id_fk" FOREIGN KEY ("source_media_id") REFERENCES "public"."inventory_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_public_media" ADD CONSTRAINT "inventory_public_media_created_by_user_id_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_public_media_item_idx" ON "inventory_public_media" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_public_media_one_ready_per_item_idx" ON "inventory_public_media" USING btree ("inventory_item_id") WHERE "inventory_public_media"."state" = 'ready';
--> statement-breakpoint
ALTER TABLE "inventory_public_media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "inventory_public_media" FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE "inventory_public_media" TO authenticated;--> statement-breakpoint
CREATE POLICY inventory_public_media_staff_access ON "inventory_public_media"
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('paixao-clutch-media', 'paixao-clutch-media', true, 4194304, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 4194304,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];--> statement-breakpoint
CREATE POLICY paixao_clutch_media_objects_staff_access ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'paixao-clutch-media' AND public.is_staff_or_admin())
  WITH CHECK (bucket_id = 'paixao-clutch-media' AND public.is_staff_or_admin());--> statement-breakpoint
-- Legacy manual paths have no confirmed public-media provenance. Staff must
-- explicitly upload or promote an image before republishing these items.
UPDATE "inventory_items" SET "paixao_clutch_published" = false, "paixao_clutch_public_image_path" = NULL
WHERE "paixao_clutch_public_image_path" IS NOT NULL OR "paixao_clutch_published" = true;
