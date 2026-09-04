alter table "payments" enable row level security;
--> statement-breakpoint

create policy "payments_staff_access"
  on "payments" for all
  using (public.is_staff_or_admin());
--> statement-breakpoint

alter table "expenses" enable row level security;
--> statement-breakpoint

create policy "expenses_staff_access"
  on "expenses" for all
  using (public.is_staff_or_admin());
