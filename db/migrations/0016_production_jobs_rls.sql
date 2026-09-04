alter table "production_jobs" enable row level security;
--> statement-breakpoint

create policy "production_jobs_staff_access"
  on "production_jobs" for all
  using (public.is_staff_or_admin());
