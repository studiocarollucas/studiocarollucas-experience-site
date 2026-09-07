alter table public.clients add column cpf text;
alter table public.clients add column address_street text;
alter table public.clients add column address_number text;
alter table public.clients add column address_complement text;
alter table public.clients add column address_neighborhood text;
alter table public.clients add column address_city text;
alter table public.clients add column address_state text;
alter table public.clients add column address_postal_code text;
--> statement-breakpoint

create type public.contract_status as enum ('issued', 'voided');
--> statement-breakpoint
create table public.contracts (
  id uuid primary key not null,
  contract_number text not null,
  shoot_id uuid not null,
  client_id uuid not null,
  status public.contract_status not null default 'issued',
  template_version text not null,
  issued_by_auth_user_id uuid not null,
  issued_at timestamp with time zone not null default now(),
  image_usage_authorized boolean not null,
  snapshot jsonb not null,
  pdf_storage_path text not null,
  constraint contracts_contract_number_unique unique (contract_number),
  constraint contracts_pdf_storage_path_unique unique (pdf_storage_path)
);
--> statement-breakpoint
create index contracts_shoot_issued_at_idx on public.contracts (shoot_id, issued_at desc);
create index contracts_client_issued_at_idx on public.contracts (client_id, issued_at desc);
--> statement-breakpoint
alter table public.contracts enable row level security;
revoke all on table public.contracts from anon, authenticated;
grant select, insert on table public.contracts to authenticated;
create policy contracts_staff_access on public.contracts
  for all to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
--> statement-breakpoint

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do update set public = false;
create policy contracts_objects_staff_access on storage.objects
  for all to authenticated
  using (bucket_id = 'contracts' and public.is_staff_or_admin())
  with check (bucket_id = 'contracts' and public.is_staff_or_admin());
