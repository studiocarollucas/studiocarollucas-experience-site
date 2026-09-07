alter table public.styling_references
  add constraint styling_references_shoot_id_fkey
  foreign key (shoot_id) references public.shoots(id) on delete cascade;
--> statement-breakpoint
alter table public.styling_references
  add constraint styling_references_uploaded_by_auth_user_id_fkey
  foreign key (uploaded_by_auth_user_id) references auth.users(id) on delete set null;
--> statement-breakpoint
alter table public.styling_references
  add constraint styling_references_caption_length check (char_length(caption) <= 500);
--> statement-breakpoint
create index styling_references_shoot_created_idx
  on public.styling_references (shoot_id, created_at);
--> statement-breakpoint

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
--> statement-breakpoint

create or replace function private.enforce_styling_reference_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.shoot_id::text, 0)
  );
  if (
    select count(*)
    from public.styling_references
    where shoot_id = new.shoot_id
  ) >= 20 then
    raise exception 'styling reference limit reached' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_styling_reference_limit() from public, anon, authenticated;
--> statement-breakpoint
create trigger styling_references_limit
before insert on public.styling_references
for each row execute function private.enforce_styling_reference_limit();
--> statement-breakpoint

alter table public.styling_references enable row level security;
revoke all on table public.styling_references from anon, authenticated;
revoke all on type public.styling_reference_origin from public, anon, authenticated;
grant usage on type public.styling_reference_origin to authenticated, service_role;
grant select (id, shoot_id, storage_path, caption, origin, uploaded_by_auth_user_id, created_at)
  on table public.styling_references to authenticated;
grant insert (shoot_id, storage_path, caption, origin, uploaded_by_auth_user_id)
  on table public.styling_references to authenticated;
grant delete on table public.styling_references to authenticated;
--> statement-breakpoint

create policy styling_references_staff_access on public.styling_references
for all to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());
--> statement-breakpoint
create policy styling_references_client_read on public.styling_references
for select to authenticated
using (public.owns_portal_shoot(shoot_id));
--> statement-breakpoint
create policy styling_references_client_insert on public.styling_references
for insert to authenticated
with check (
  public.owns_portal_shoot(shoot_id)
  and origin = 'client'
  and uploaded_by_auth_user_id = auth.uid()
  and split_part(storage_path, '/', 1) = auth.uid()::text
  and split_part(storage_path, '/', 2) = shoot_id::text
);
--> statement-breakpoint
create policy styling_references_client_delete on public.styling_references
for delete to authenticated
using (
  public.owns_portal_shoot(shoot_id)
  and uploaded_by_auth_user_id = auth.uid()
);
--> statement-breakpoint

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'styling-references', 'styling-references', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
--> statement-breakpoint

create or replace function private.owns_styling_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_shoot_id uuid;
begin
  target_shoot_id := pg_catalog.split_part(object_name, '/', 2)::uuid;
  return public.owns_portal_shoot(target_shoot_id);
exception when invalid_text_representation then
  return false;
end;
$$;
revoke all on function private.owns_styling_object(text) from public, anon, authenticated;
grant execute on function private.owns_styling_object(text) to authenticated;
--> statement-breakpoint

create policy styling_objects_client_read on storage.objects
for select to authenticated
using (
  bucket_id = 'styling-references'
  and private.owns_styling_object(name)
);
--> statement-breakpoint
create policy styling_objects_client_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'styling-references'
  and split_part(name, '/', 1) = auth.uid()::text
  and private.owns_styling_object(name)
);
--> statement-breakpoint
create policy styling_objects_client_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'styling-references'
  and split_part(name, '/', 1) = auth.uid()::text
  and private.owns_styling_object(name)
);
--> statement-breakpoint
create policy styling_objects_staff_access on storage.objects
for all to authenticated
using (
  bucket_id = 'styling-references'
  and public.is_staff_or_admin()
)
with check (
  bucket_id = 'styling-references'
  and public.is_staff_or_admin()
);
