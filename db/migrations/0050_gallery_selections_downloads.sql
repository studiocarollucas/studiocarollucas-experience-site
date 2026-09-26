CREATE TABLE "photo_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photo_selections_client_gallery_asset_unique" UNIQUE("client_id","gallery_id","asset_id")
);
--> statement-breakpoint
ALTER TABLE "galleries" ADD COLUMN "downloads_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "photo_selections" ADD CONSTRAINT "photo_selections_gallery_id_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_selections" ADD CONSTRAINT "photo_selections_asset_id_gallery_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."gallery_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_selections" ADD CONSTRAINT "photo_selections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photo_selections_gallery_asset_idx" ON "photo_selections" USING btree ("gallery_id","asset_id");--> statement-breakpoint
-- Hand-written: selections are written only by the server (Drizzle) after the
-- portal domain authorizes the asset for the signed-in client. Through the
-- PostgREST API, only staff/admin may read them; nobody may write them.
ALTER TABLE "photo_selections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "photo_selections" FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE "photo_selections" TO authenticated;--> statement-breakpoint
CREATE POLICY photo_selections_staff_access ON "photo_selections"
  FOR SELECT TO authenticated
  USING (public.is_staff_or_admin());
