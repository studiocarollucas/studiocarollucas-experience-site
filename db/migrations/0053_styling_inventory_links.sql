ALTER TABLE "styling_references" ADD COLUMN "inventory_item_id" uuid;--> statement-breakpoint
ALTER TABLE "styling_references" ADD CONSTRAINT "styling_references_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "styling_references_shoot_inventory_item_idx" ON "styling_references" USING btree ("shoot_id","inventory_item_id");
--> statement-breakpoint
-- Keep 0027's column-level client grants. Staff writes use the server's
-- privileged connection; the existing staff-only UPDATE policy remains intact.
revoke insert (inventory_item_id), update (inventory_item_id)
  on table public.styling_references from anon, authenticated;
--> statement-breakpoint
-- Defense in depth if grants change later: a client may keep adding/removing
-- free references, but cannot forge a new link or change an existing one.
create or replace function private.guard_styling_inventory_link()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (
    (tg_op = 'INSERT' and new.inventory_item_id is not null)
    or (tg_op = 'UPDATE' and new.inventory_item_id is distinct from old.inventory_item_id)
  ) then
    return new;
  end if;

  -- current_user is the actual database role, unlike caller-supplied JWT data.
  -- Invoker security preserves that role for normal Drizzle/Postgres writes.
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;
  if current_user <> 'authenticated' then
    raise exception 'styling inventory link requires staff'
      using errcode = 'insufficient_privilege';
  end if;
  if auth.uid() is null or not public.is_staff_or_admin() then
    raise exception 'styling inventory link requires staff'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_styling_inventory_link()
  from public, anon, authenticated;
--> statement-breakpoint
create trigger styling_references_inventory_link_guard
before insert or update of inventory_item_id on public.styling_references
for each row execute function private.guard_styling_inventory_link();
