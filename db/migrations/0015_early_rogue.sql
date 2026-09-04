CREATE TYPE "public"."production_job_status" AS ENUM('aguardando', 'iniciado', 'parcial', 'finalizado', 'entregue');--> statement-breakpoint
CREATE TABLE "production_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoot_id" uuid NOT NULL,
	"status" "production_job_status" DEFAULT 'aguardando' NOT NULL,
	"editor_user_id" uuid,
	"photos_to_edit" integer,
	"delivery_due_at" date,
	"delivery_at" date,
	"selection_status" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_jobs_shoot_id_unique" UNIQUE("shoot_id")
);
--> statement-breakpoint
alter table "production_jobs"
  add constraint "production_jobs_shoot_id_fkey"
  foreign key ("shoot_id") references "shoots"("id");
--> statement-breakpoint
alter table "production_jobs"
  add constraint "production_jobs_editor_user_id_fkey"
  foreign key ("editor_user_id") references "profiles"("id");
