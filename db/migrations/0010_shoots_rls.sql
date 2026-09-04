alter table "shoots" enable row level security;
--> statement-breakpoint

create policy "shoots_staff_access"
  on "shoots" for all
  using (public.is_staff_or_admin());
