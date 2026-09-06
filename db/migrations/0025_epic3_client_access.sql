create or replace function public.owns_portal_shoot(target_shoot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shoots s
    join public.clients c on c.id = s.client_id
    where s.id = target_shoot_id
      and s.portal_enabled = true
      and s.status <> 'cancelado'
      and c.auth_user_id = auth.uid()
  );
$$;
--> statement-breakpoint
revoke all on function public.owns_portal_shoot(uuid) from public;
grant execute on function public.owns_portal_shoot(uuid) to authenticated;
--> statement-breakpoint

update public.preparation_tasks
set client_actionable = true
where visible_to_client = true
  and type in ('moodboard', 'figurino', 'clutch', 'make', 'confirmacao_horario');
--> statement-breakpoint
alter table public.preparation_tasks
  add constraint preparation_tasks_actionable_requires_visible
  check (not client_actionable or visible_to_client);
--> statement-breakpoint

update public.preparation_tasks
set completed_at = case when status = 'concluida' then coalesce(completed_at, now()) else null end;
--> statement-breakpoint
create or replace function public.sync_preparation_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'concluida' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger preparation_tasks_sync_completed_at
before insert or update of status on public.preparation_tasks
for each row execute function public.sync_preparation_completed_at();
--> statement-breakpoint
alter table public.preparation_tasks
  add constraint preparation_tasks_status_completed_consistent
  check ((status = 'concluida') = (completed_at is not null));
--> statement-breakpoint

grant select (id, name) on table public.clients to authenticated;
grant select (
  id, client_id, experience_package_id, shoot_date, start_time, status,
  agreed_price, payment_status, portal_enabled, location_name, location_address,
  client_guidance
) on table public.shoots to authenticated;
grant select (
  id, name, included_photos, duration_minutes, scenes, make_included,
  outfits_limit, clutch_included
) on table public.experience_packages to authenticated;
grant select (id, shoot_id, amount, paid_at, status) on table public.payments to authenticated;
grant select (
  id, shoot_id, type, title, status, due_at, visible_to_client,
  client_actionable, completed_at, created_at
) on table public.preparation_tasks to authenticated;
grant update (status) on table public.preparation_tasks to authenticated;
--> statement-breakpoint

create policy clients_client_read on public.clients
for select to authenticated
using (auth_user_id = auth.uid());
--> statement-breakpoint
create policy shoots_client_read on public.shoots
for select to authenticated
using (public.owns_portal_shoot(id));
--> statement-breakpoint
create policy experience_packages_client_read on public.experience_packages
for select to authenticated
using (
  exists (
    select 1 from public.shoots s
    where s.experience_package_id = experience_packages.id
      and public.owns_portal_shoot(s.id)
  )
);
--> statement-breakpoint
create policy payments_client_read on public.payments
for select to authenticated
using (status = 'confirmado' and public.owns_portal_shoot(shoot_id));
--> statement-breakpoint
create policy preparation_tasks_client_read on public.preparation_tasks
for select to authenticated
using (visible_to_client = true and public.owns_portal_shoot(shoot_id));
--> statement-breakpoint
create policy preparation_tasks_client_update on public.preparation_tasks
for update to authenticated
using (client_actionable = true and public.owns_portal_shoot(shoot_id))
with check (client_actionable = true and visible_to_client = true and public.owns_portal_shoot(shoot_id));
