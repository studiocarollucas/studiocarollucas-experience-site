CREATE TABLE "lead_conversions" (
	"lead_id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"converted_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_conversions" ADD CONSTRAINT "lead_conversions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_conversions" ADD CONSTRAINT "lead_conversions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
alter table public.lead_conversions enable row level security;
revoke all on table public.lead_conversions from anon, authenticated;
grant select, insert, update, delete on table public.lead_conversions to authenticated;
create policy lead_conversions_staff_access on public.lead_conversions
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
