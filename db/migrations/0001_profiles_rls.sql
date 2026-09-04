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
-- RLS restricts rows, not columns: without this revoke, `profiles_update_own` would let
-- any logged-in user run `update profiles set role = 'admin' where id = auth.uid()`.
-- `authenticated` is the Postgres role Supabase's Data API (PostgREST) assumes for a
-- logged-in user; `anon` has no UPDATE grant on this table, so it needs no revoke.
revoke update (role) on table "profiles" from "authenticated";
