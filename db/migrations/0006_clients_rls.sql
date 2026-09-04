alter table "clients" enable row level security;
--> statement-breakpoint

create policy "clients_staff_access"
  on "clients" for all
  using (public.is_staff_or_admin());
--> statement-breakpoint

-- Deferred to Epic 3: a client reading their own row via
-- `auth_user_id = auth.uid()`. Not added yet because nothing in the app reads this
-- table through a browser Supabase client today — the app layer (Drizzle) is the
-- only consumer, and it isn't subject to RLS at all (docs/DECISIONS.md, 2026-09-03).
-- Adding an unused policy now would be untested, unreviewed surface area.
