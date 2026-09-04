-- Nothing creates a "profiles" row today, so every authenticated user would fall back to
-- the default "client" role forever (see resolveRole in lib/auth/session.ts). This trigger
-- mirrors every new auth.users row into public.profiles. The `on conflict do nothing` keeps
-- an already-seeded profile from raising a unique violation: this runs in an AFTER INSERT
-- trigger, so the error would propagate and abort the auth.users insert (signup would fail).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- profiles.email is NOT NULL. The MVP only uses email-based auth (magic link for clients,
  -- e-mail + password for staff), so new.email is always present today; the coalesce is a
  -- defensive guard so that enabling phone or anonymous sign-in later — where auth.users.email
  -- is NULL — degrades to an empty string instead of aborting signup with an opaque DB error.
  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;--> statement-breakpoint
drop trigger if exists on_auth_user_created on auth.users;--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();--> statement-breakpoint
-- Dropped first so the whole file stays re-runnable, matching the create-or-replace /
-- drop-if-exists / on-conflict convention used by every other statement here.
alter table "profiles" drop constraint if exists profiles_id_fkey;--> statement-breakpoint
alter table "profiles"
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;
