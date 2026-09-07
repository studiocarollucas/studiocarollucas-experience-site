CREATE TYPE "public"."styling_reference_origin" AS ENUM('client', 'studio');--> statement-breakpoint
CREATE TABLE "styling_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoot_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"caption" text,
	"origin" "styling_reference_origin" NOT NULL,
	"uploaded_by_auth_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "styling_references_storage_path_unique" UNIQUE("storage_path")
);
