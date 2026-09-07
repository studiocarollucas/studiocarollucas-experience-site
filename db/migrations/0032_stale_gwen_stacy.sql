CREATE TABLE "experience_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experience_families_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "experience_packages" ADD COLUMN "family_id" uuid;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD COLUMN "scene_count" integer;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD COLUMN "hair_included" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD COLUMN "participant_limit" integer;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD COLUMN "video_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD COLUMN "palette_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD COLUMN "quiz_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD CONSTRAINT "experience_packages_family_id_experience_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."experience_families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_packages" ADD CONSTRAINT "experience_packages_family_name_unique" UNIQUE("family_id","name");--> statement-breakpoint
ALTER TABLE "experience_families" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "experience_families_staff_access"
  ON "experience_families" FOR ALL
  USING (public.is_staff_or_admin());--> statement-breakpoint
REVOKE ALL ON TABLE "experience_families" FROM anon, authenticated;
