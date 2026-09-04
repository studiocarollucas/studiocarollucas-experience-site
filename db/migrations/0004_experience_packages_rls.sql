-- Generalizes public.is_admin() (0001_profiles_rls.sql) to also admit staff, since
-- Studio OS business tables (catalog, clients, shoots, ...) are staff+admin territory,
-- not admin-only. Same security-definer pattern: runs as the function owner (table
-- owner), which bypasses RLS by default, so this does not recurse into any policy
-- that calls it.
create or replace function public.is_staff_or_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;
--> statement-breakpoint

alter table "experience_packages" enable row level security;
--> statement-breakpoint

create policy "experience_packages_staff_access"
  on "experience_packages" for all
  using (public.is_staff_or_admin());
