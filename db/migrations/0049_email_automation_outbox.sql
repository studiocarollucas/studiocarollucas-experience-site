CREATE TYPE "public"."notification_channel" AS ENUM('email');--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_status" AS ENUM('pending', 'sending', 'retry', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "automation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"channel" "notification_channel" DEFAULT 'email' NOT NULL,
	"template_key" text NOT NULL,
	"template_version" integer NOT NULL,
	"recipient" text NOT NULL,
	"template_data" jsonb NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_error" text,
	"provider" text,
	"provider_message_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_event_template_recipient_unique" UNIQUE("event_id","template_key","recipient"),
	CONSTRAINT "notification_deliveries_attempts_valid" CHECK ("notification_deliveries"."attempt_count" >= 0 and "notification_deliveries"."max_attempts" > 0),
	CONSTRAINT "notification_deliveries_template_version_positive" CHECK ("notification_deliveries"."template_version" > 0),
	CONSTRAINT "notification_deliveries_sent_has_sent_at" CHECK ("notification_deliveries"."status" <> 'sent' or "notification_deliveries"."sent_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_event_id_automation_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."automation_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_events_entity_idx" ON "automation_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_due_idx" ON "notification_deliveries" USING btree ("status","next_attempt_at");
--> statement-breakpoint
-- Server-only outbox: the app reads/writes through Drizzle (DATABASE_URL, table
-- owner). Recipients are personal data and templates carry client context, so the
-- Data API roles get nothing: RLS on, every privilege revoked, no policy, no grant.
ALTER TABLE "automation_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "automation_events" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "notification_deliveries" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TYPE public.notification_channel FROM public, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TYPE public.notification_delivery_status FROM public, anon, authenticated;
--> statement-breakpoint
GRANT USAGE ON TYPE public.notification_channel TO service_role;
--> statement-breakpoint
GRANT USAGE ON TYPE public.notification_delivery_status TO service_role;
