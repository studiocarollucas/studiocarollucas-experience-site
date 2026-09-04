alter table "leads" enable row level security;
--> statement-breakpoint

create policy "leads_staff_access"
  on "leads" for all
  using (public.is_staff_or_admin());
