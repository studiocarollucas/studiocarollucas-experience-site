ALTER TABLE "shoots" ADD COLUMN "location_name" text;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "location_address" text;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "client_guidance" text;--> statement-breakpoint
ALTER TABLE "preparation_tasks" ADD COLUMN "client_actionable" boolean DEFAULT false NOT NULL;