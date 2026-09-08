CREATE TYPE "public"."gallery_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "galleries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoot_id" uuid NOT NULL,
	"status" "gallery_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "galleries_shoot_id_unique" UNIQUE("shoot_id")
);
--> statement-breakpoint
CREATE TABLE "gallery_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_assets_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_assets" ADD CONSTRAINT "gallery_assets_gallery_id_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_assets_gallery_sort_idx" ON "gallery_assets" USING btree ("gallery_id","sort_order","created_at");
--> statement-breakpoint
alter table public.galleries enable row level security;
alter table public.gallery_assets enable row level security;
revoke all on table public.galleries from anon, authenticated;
revoke all on table public.gallery_assets from anon, authenticated;
revoke all on type public.gallery_status from public, anon, authenticated;
grant usage on type public.gallery_status to authenticated, service_role;
grant select, insert, update, delete on table public.galleries to authenticated;
grant select, insert, update, delete on table public.gallery_assets to authenticated;
create policy galleries_staff_access on public.galleries
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
create policy gallery_assets_staff_access on public.gallery_assets
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
--> statement-breakpoint
insert into storage.buckets (id, name, public)
values ('gallery-assets', 'gallery-assets', false)
on conflict (id) do update set public = false;
drop policy if exists gallery_assets_objects_staff_access on storage.objects;
create policy gallery_assets_objects_staff_access on storage.objects
  for all to authenticated
  using (bucket_id = 'gallery-assets' and public.is_staff_or_admin())
  with check (bucket_id = 'gallery-assets' and public.is_staff_or_admin());
