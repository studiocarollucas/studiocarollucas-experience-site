CREATE TYPE "public"."preparation_task_status" AS ENUM('pendente', 'em_andamento', 'concluida');--> statement-breakpoint
CREATE TABLE "preparation_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoot_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"status" "preparation_task_status" DEFAULT 'pendente' NOT NULL,
	"due_at" timestamp with time zone,
	"visible_to_client" boolean DEFAULT true NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
alter table "preparation_tasks"
  add constraint "preparation_tasks_shoot_id_fkey"
  foreign key ("shoot_id") references "shoots"("id");
