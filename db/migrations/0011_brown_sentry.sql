CREATE TYPE "public"."payment_entry_status" AS ENUM('pendente', 'confirmado', 'estornado');--> statement-breakpoint
CREATE TYPE "public"."expense_type" AS ENUM('custo', 'investimento', 'funcionario');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoot_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paid_at" timestamp with time zone,
	"method" text,
	"status" "payment_entry_status" DEFAULT 'pendente' NOT NULL,
	"proof_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"type" "expense_type" NOT NULL,
	"category" text,
	"amount" numeric(10, 2) NOT NULL,
	"method" text,
	"recurring" boolean DEFAULT false NOT NULL,
	"proof_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
alter table "payments"
  add constraint "payments_shoot_id_fkey"
  foreign key ("shoot_id") references "shoots"("id");
