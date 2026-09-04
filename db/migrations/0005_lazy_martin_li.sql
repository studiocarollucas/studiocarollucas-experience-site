CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"instagram_handle" text,
	"birthday" date,
	"source" text,
	"referrer_client_id" uuid,
	"style_profile" text,
	"notes" text,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
alter table "clients"
  add constraint "clients_referrer_client_id_fkey"
  foreign key ("referrer_client_id") references "clients"("id");
