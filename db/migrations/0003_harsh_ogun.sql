CREATE TABLE "experience_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"included_photos" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"scenes" text,
	"make_included" boolean DEFAULT false NOT NULL,
	"outfits_limit" integer,
	"clutch_included" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
