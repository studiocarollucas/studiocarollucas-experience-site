alter table "preparation_tasks" enable row level security;
--> statement-breakpoint

create policy "preparation_tasks_staff_access"
  on "preparation_tasks" for all
  using (public.is_staff_or_admin());
