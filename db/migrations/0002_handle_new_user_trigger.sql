-- Nothing creates a "profiles" row today, so every authenticated user would fall back to
-- the default "client" role forever (see resolveRole in lib/auth/session.ts). This trigger
-- mirrors every new auth.users row into public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client');
  return new;
end;
$$;--> statement-breakpoint
drop trigger if exists on_auth_user_created on auth.users;--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();--> statement-breakpoint
alter table "profiles"
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;
