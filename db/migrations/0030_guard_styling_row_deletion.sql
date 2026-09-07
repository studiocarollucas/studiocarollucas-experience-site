create or replace function private.styling_object_is_absent(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from storage.objects
    where bucket_id = 'styling-references'
      and name = object_name
  );
$$;
revoke all on function private.styling_object_is_absent(text)
  from public, anon, authenticated;
grant execute on function private.styling_object_is_absent(text) to authenticated;
--> statement-breakpoint

drop policy styling_references_client_delete on public.styling_references;
create policy styling_references_client_delete on public.styling_references
for delete to authenticated
using (
  public.owns_portal_shoot(shoot_id)
  and origin = 'client'
  and uploaded_by_auth_user_id = auth.uid()
  and private.styling_object_is_absent(storage_path)
);
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
    from (
      select styling_references.storage_path
      from public.styling_references
      where styling_references.shoot_id = new.shoot_id
      union
      select objects.name
      from storage.objects
      where objects.bucket_id = 'styling-references'
        and pg_catalog.split_part(objects.name, '/', 2) = new.shoot_id::text
    ) as occupied_paths
  ) >= 20 then
    raise exception 'styling reference limit reached' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_styling_reference_limit()
  from public, anon, authenticated;
