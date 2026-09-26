CREATE TYPE "public"."review_status" AS ENUM('solicitado', 'concluido', 'cancelado');--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"shoot_id" uuid,
	"status" "review_status" DEFAULT 'solicitado' NOT NULL,
	"source" text NOT NULL,
	"target" text NOT NULL,
	"target_url" text,
	"requested_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_source_valid" CHECK ("reviews"."source" in ('manual', 'automacao', 'portal')),
	CONSTRAINT "reviews_target_valid" CHECK ("reviews"."target" in ('google', 'instagram', 'interno', 'outro')),
	CONSTRAINT "reviews_requested_has_requested_at" CHECK ("reviews"."status" <> 'solicitado' or "reviews"."requested_at" is not null),
	CONSTRAINT "reviews_completed_has_completed_at" CHECK (("reviews"."status" = 'concluido') = ("reviews"."completed_at" is not null)),
	CONSTRAINT "reviews_completed_after_requested" CHECK ("reviews"."requested_at" is null or "reviews"."completed_at" is null or "reviews"."completed_at" >= "reviews"."requested_at")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_client_id" uuid NOT NULL,
	"referred_client_id" uuid,
	"lead_id" uuid,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_at" timestamp with time zone,
	CONSTRAINT "referrals_referred_client_id_unique" UNIQUE("referred_client_id"),
	CONSTRAINT "referrals_lead_id_unique" UNIQUE("lead_id"),
	CONSTRAINT "referrals_source_valid" CHECK ("referrals"."source" in ('lead', 'cliente', 'legado')),
	CONSTRAINT "referrals_has_referred" CHECK ("referrals"."referred_client_id" is not null or "referrals"."lead_id" is not null),
	CONSTRAINT "referrals_lead_source_has_lead" CHECK ("referrals"."source" <> 'lead' or "referrals"."lead_id" is not null),
	CONSTRAINT "referrals_not_self" CHECK ("referrals"."referrer_client_id" <> "referrals"."referred_client_id"),
	CONSTRAINT "referrals_converted_consistent" CHECK (("referrals"."referred_client_id" is null) = ("referrals"."converted_at" is null))
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_client_id_clients_id_fk" FOREIGN KEY ("referrer_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_client_id_clients_id_fk" FOREIGN KEY ("referred_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_client_idx" ON "reviews" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_one_active_per_shoot_target_idx" ON "reviews" USING btree ("shoot_id","target") WHERE "reviews"."shoot_id" is not null and "reviews"."status" <> 'cancelado';--> statement-breakpoint
CREATE INDEX "referrals_referrer_client_idx" ON "referrals" USING btree ("referrer_client_id");
--> statement-breakpoint
-- Hand-written (SCL-720): integrity that a CHECK cannot express.
-- A review's Shoot, when present, must belong to the same Client.
create or replace function private.reviews_shoot_matches_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.shoot_id is not null and not exists (
    select 1
    from public.shoots
    where shoots.id = new.shoot_id
      and shoots.client_id = new.client_id
  ) then
    raise exception 'review shoot belongs to another client'
      using errcode = 'check_violation', constraint = 'reviews_shoot_matches_client';
  end if;
  return new;
end;
$$;
revoke all on function private.reviews_shoot_matches_client()
  from public, anon, authenticated;
--> statement-breakpoint
create trigger reviews_shoot_matches_client
before insert or update of client_id, shoot_id on public.reviews
for each row execute function private.reviews_shoot_matches_client();
--> statement-breakpoint
-- referred_client_id is unique, so every client has at most one referrer and the
-- client-to-client referral graph is a forest. Walking up from the new referrer
-- is enough to find any cycle (A→B + B→A, or longer). One transaction-scoped
-- advisory lock serializes every write that links two clients, so two concurrent
-- transactions cannot both pass the walk.
create or replace function private.referrals_guard_graph()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ancestor uuid;
  hops integer := 0;
begin
  if new.referred_client_id is null then
    return new;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public.referrals', 0)
  );
  ancestor := new.referrer_client_id;
  while ancestor is not null loop
    if ancestor = new.referred_client_id then
      raise exception 'referral cycle'
        using errcode = 'check_violation', constraint = 'referrals_no_cycle';
    end if;
    hops := hops + 1;
    if hops > 10000 then
      raise exception 'referral chain too long'
        using errcode = 'check_violation', constraint = 'referrals_no_cycle';
    end if;
    select referrals.referrer_client_id
      into ancestor
      from public.referrals
      where referrals.referred_client_id = ancestor
        and referrals.id <> new.id;
  end loop;
  return new;
end;
$$;
revoke all on function private.referrals_guard_graph()
  from public, anon, authenticated;
--> statement-breakpoint
create trigger referrals_guard_graph
before insert or update of referrer_client_id, referred_client_id on public.referrals
for each row execute function private.referrals_guard_graph();
--> statement-breakpoint
-- Legacy clients.referrer_client_id → referrals (docs/DECISIONS.md, 2026-09-26).
-- Self-referrals and reciprocal pairs are inconsistent legacy data: they are not
-- copied and stay visible in the frozen column for manual review.
insert into public.referrals (referrer_client_id, referred_client_id, source, created_at, converted_at)
select c.referrer_client_id, c.id, 'legado', c.created_at, c.created_at
from public.clients c
where c.referrer_client_id is not null
  and c.referrer_client_id <> c.id
  and not exists (
    select 1
    from public.clients r
    where r.id = c.referrer_client_id
      and r.referrer_client_id = c.id
  );
--> statement-breakpoint
-- The legacy column is frozen: referrals is the only source of truth.
create or replace function private.clients_referrer_client_id_frozen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' and new.referrer_client_id is not null)
    or (tg_op = 'UPDATE' and new.referrer_client_id is distinct from old.referrer_client_id) then
    raise exception 'clients.referrer_client_id is legacy; record referrals in public.referrals'
      using errcode = 'check_violation', constraint = 'clients_referrer_client_id_frozen';
  end if;
  return new;
end;
$$;
revoke all on function private.clients_referrer_client_id_frozen()
  from public, anon, authenticated;
--> statement-breakpoint
create trigger clients_referrer_client_id_frozen
before insert or update of referrer_client_id on public.clients
for each row execute function private.clients_referrer_client_id_frozen();
--> statement-breakpoint
-- Staff/admin only through the Data API, like galleries/lead_conversions
-- (0036/0037). Nothing for anon; clients never read these tables directly.
alter table public.reviews enable row level security;
alter table public.referrals enable row level security;
revoke all on table public.reviews from anon, authenticated;
revoke all on table public.referrals from anon, authenticated;
revoke all on type public.review_status from public, anon, authenticated;
grant usage on type public.review_status to authenticated, service_role;
grant select, insert, update, delete on table public.reviews to authenticated;
grant select, insert, update, delete on table public.referrals to authenticated;
create policy reviews_staff_access on public.reviews
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
create policy referrals_staff_access on public.referrals
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
