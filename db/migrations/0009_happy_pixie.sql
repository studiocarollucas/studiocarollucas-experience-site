CREATE TYPE "public"."shoot_payment_status" AS ENUM('nao_iniciado', 'parcial', 'pago', 'reembolsado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."shoot_status" AS ENUM('reserva', 'preparacao', 'realizado', 'edicao', 'finalizado', 'reveal', 'entregue', 'cancelado', 'reagendado');--> statement-breakpoint
CREATE TABLE "shoots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"experience_package_id" uuid NOT NULL,
	"shoot_date" date NOT NULL,
	"start_time" time,
	"status" "shoot_status" DEFAULT 'reserva' NOT NULL,
	"agreed_price" numeric(10, 2) NOT NULL,
	"payment_status" "shoot_payment_status" DEFAULT 'nao_iniciado' NOT NULL,
	"participant_count" integer,
	"occasion" text,
	"referral" text,
	"notes" text,
	"portal_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
alter table "shoots"
  add constraint "shoots_client_id_fkey"
  foreign key ("client_id") references "clients"("id");
--> statement-breakpoint
alter table "shoots"
  add constraint "shoots_experience_package_id_fkey"
  foreign key ("experience_package_id") references "experience_packages"("id");
