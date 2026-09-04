CREATE TYPE "public"."lead_status" AS ENUM('novo', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"name" text,
	"phone" text,
	"email" text,
	"source" text NOT NULL,
	"occasion" text,
	"quiz_result" text,
	"status" "lead_status" DEFAULT 'novo' NOT NULL,
	"lost_reason" text,
	"owner" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
alter table "leads"
  add constraint "leads_client_id_fkey"
  foreign key ("client_id") references "clients"("id");
--> statement-breakpoint
alter table "leads"
  add constraint "leads_owner_fkey"
  foreign key ("owner") references "profiles"("id");
