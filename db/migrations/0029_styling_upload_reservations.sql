create or replace function private.has_styling_reference(
  object_name text,
  expected_uploader_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.styling_references
    where storage_path = object_name
      and uploaded_by_auth_user_id = expected_uploader_id
  );
$$;
revoke all on function private.has_styling_reference(text, uuid)
  from public, anon, authenticated;
grant execute on function private.has_styling_reference(text, uuid) to authenticated;
--> statement-breakpoint

drop policy styling_objects_client_insert on storage.objects;
create policy styling_objects_client_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'styling-references'
  and private.is_canonical_styling_path(name, auth.uid(), null::uuid)
  and private.owns_styling_object(name)
  and private.has_styling_reference(name, auth.uid())
);
--> statement-breakpoint

drop policy styling_objects_staff_access on storage.objects;
create policy styling_objects_staff_access on storage.objects
for all to authenticated
using (
  bucket_id = 'styling-references'
  and public.is_staff_or_admin()
)
with check (
  bucket_id = 'styling-references'
  and public.is_staff_or_admin()
  and private.is_canonical_styling_path(name, auth.uid(), null::uuid)
  and private.has_styling_reference(name, auth.uid())
);
