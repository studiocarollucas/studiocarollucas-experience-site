alter table "profiles" enable row level security;--> statement-breakpoint
-- `security definer` breaks the RLS recursion: a policy on "profiles" cannot read
-- "profiles" directly (Postgres raises 42P17 infinite recursion). This function runs
-- as its owner (the table owner), whose queries bypass RLS unless FORCE ROW LEVEL
-- SECURITY is set — which it is not — so the lookup below does not re-enter the policy.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;--> statement-breakpoint
create policy "profiles_select_own"
  on "profiles" for select
  using (auth.uid() = id);--> statement-breakpoint
create policy "profiles_update_own"
  on "profiles" for update
  using (auth.uid() = id);--> statement-breakpoint
create policy "profiles_admin_full_access"
  on "profiles" for all
  using (public.is_admin());--> statement-breakpoint
-- RLS restricts rows, not columns: without this, `profiles_update_own` would let any logged-in
-- user run `update profiles set role = 'admin' where id = auth.uid()`.
--
-- This MUST revoke at table level first. Per the PostgreSQL docs, "if a role has been granted
-- privileges on a table, then revoking the same privileges from individual columns will have no
-- effect" — and Supabase grants `authenticated` table-level UPDATE on everything in `public`
-- through ALTER DEFAULT PRIVILEGES configured outside this repo, so a column-level revoke alone
-- is silently a no-op. Both API roles are revoked explicitly rather than assuming what `anon`
-- was granted, since those defaults are not visible anywhere in this repository.
revoke update on table "profiles" from "authenticated", "anon";--> statement-breakpoint
-- Grant back only the column a user may legitimately change about themselves.
grant update ("full_name") on table "profiles" to "authenticated";
