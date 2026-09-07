create or replace function private.is_canonical_styling_path(
  object_name text,
  expected_uploader_id uuid,
  expected_shoot_id uuid
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  path_parts text[];
  uploader_id uuid;
  target_shoot_id uuid;
  uuid_pattern constant text :=
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  path_parts := pg_catalog.string_to_array(object_name, '/');

  if pg_catalog.array_length(path_parts, 1) is distinct from 3
    or path_parts[1] = ''
    or path_parts[2] = ''
    or path_parts[3] = ''
    or path_parts[1] !~ uuid_pattern
    or path_parts[2] !~ uuid_pattern
    or path_parts[3] in ('.', '..') then
    return false;
  end if;

  uploader_id := path_parts[1]::uuid;
  target_shoot_id := path_parts[2]::uuid;

  return (expected_uploader_id is null or uploader_id = expected_uploader_id)
    and (expected_shoot_id is null or target_shoot_id = expected_shoot_id);
exception when invalid_text_representation then
  return false;
end;
$$;
revoke all on function private.is_canonical_styling_path(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.is_canonical_styling_path(text, uuid, uuid) to authenticated;
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
  if not private.is_canonical_styling_path(object_name, null::uuid, null::uuid) then
    return false;
  end if;

  target_shoot_id := pg_catalog.split_part(object_name, '/', 2)::uuid;
  return public.owns_portal_shoot(target_shoot_id);
exception when invalid_text_representation then
  return false;
end;
$$;
revoke all on function private.owns_styling_object(text) from public, anon, authenticated;
grant execute on function private.owns_styling_object(text) to authenticated;
--> statement-breakpoint

drop policy styling_references_client_insert on public.styling_references;
create policy styling_references_client_insert on public.styling_references
for insert to authenticated
with check (
  public.owns_portal_shoot(shoot_id)
  and origin = 'client'
  and uploaded_by_auth_user_id = auth.uid()
  and private.is_canonical_styling_path(storage_path, auth.uid(), shoot_id)
);
--> statement-breakpoint

drop policy styling_references_client_delete on public.styling_references;
create policy styling_references_client_delete on public.styling_references
for delete to authenticated
using (
  public.owns_portal_shoot(shoot_id)
  and origin = 'client'
  and uploaded_by_auth_user_id = auth.uid()
);
--> statement-breakpoint

drop policy styling_objects_client_read on storage.objects;
create policy styling_objects_client_read on storage.objects
for select to authenticated
using (
  bucket_id = 'styling-references'
  and private.owns_styling_object(name)
);
--> statement-breakpoint

drop policy styling_objects_client_insert on storage.objects;
create policy styling_objects_client_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'styling-references'
  and private.is_canonical_styling_path(name, auth.uid(), null::uuid)
  and private.owns_styling_object(name)
);
--> statement-breakpoint

drop policy styling_objects_client_delete on storage.objects;
create policy styling_objects_client_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'styling-references'
  and private.is_canonical_styling_path(name, auth.uid(), null::uuid)
  and private.owns_styling_object(name)
);
