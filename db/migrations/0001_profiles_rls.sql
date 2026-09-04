alter table "profiles" enable row level security;

create policy "profiles_select_own"
  on "profiles" for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on "profiles" for update
  using (auth.uid() = id);

create policy "profiles_admin_full_access"
  on "profiles" for all
  using (
    exists (
      select 1 from "profiles" p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
