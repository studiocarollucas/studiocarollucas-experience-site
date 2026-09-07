create or replace function private.has_styling_reference(
  object_name text,
  expected_uploader_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_shoot_id uuid;
begin
  if not private.is_canonical_styling_path(
    object_name,
    expected_uploader_id,
    null::uuid
  ) then
    return false;
  end if;

  target_shoot_id := pg_catalog.split_part(object_name, '/', 2)::uuid;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_shoot_id::text, 0)
  );

  return exists (
    select 1
    from public.styling_references
    where storage_path = object_name
      and uploaded_by_auth_user_id = expected_uploader_id
  );
exception when invalid_text_representation then
  return false;
end;
$$;
revoke all on function private.has_styling_reference(text, uuid)
  from public, anon, authenticated;
grant execute on function private.has_styling_reference(text, uuid) to authenticated;
--> statement-breakpoint

create or replace function private.styling_object_is_absent(object_name text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_shoot_id uuid;
begin
  if not private.is_canonical_styling_path(
    object_name,
    null::uuid,
    null::uuid
  ) then
    return false;
  end if;

  target_shoot_id := pg_catalog.split_part(object_name, '/', 2)::uuid;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_shoot_id::text, 0)
  );

  return not exists (
    select 1
    from storage.objects
    where bucket_id = 'styling-references'
      and name = object_name
  );
exception when invalid_text_representation then
  return false;
end;
$$;
revoke all on function private.styling_object_is_absent(text)
  from public, anon, authenticated;
grant execute on function private.styling_object_is_absent(text) to authenticated;
