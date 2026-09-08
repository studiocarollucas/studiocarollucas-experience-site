CREATE TYPE "public"."contractor_person_type" AS ENUM('individual', 'company');--> statement-breakpoint
CREATE TABLE "contractor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text DEFAULT 'active' NOT NULL,
	"person_type" "contractor_person_type" NOT NULL,
	"legal_name" text NOT NULL,
	"document" text NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contractor_profiles_scope_unique" UNIQUE("scope"),
	CONSTRAINT "contractor_profiles_scope_active_check" CHECK ("contractor_profiles"."scope" = 'active')
);
--> statement-breakpoint

alter table public.contractor_profiles enable row level security;
revoke all on table public.contractor_profiles from anon, authenticated;
grant select, insert, update on table public.contractor_profiles to authenticated;
create policy contractor_profiles_staff_access on public.contractor_profiles
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
--> statement-breakpoint

update public.contracts
set snapshot = jsonb_set(
  snapshot,
  '{contractor}',
  jsonb_build_object(
    'personType', 'individual',
    'legalName', snapshot->'contractor'->'name',
    'document', snapshot->'contractor'->'cpf',
    'address', snapshot->'contractor'->'address'
  )
)
where snapshot->'contractor' ? 'name';
