alter table "audit_log" enable row level security;
--> statement-breakpoint

create policy "audit_log_admin_read"
  on "audit_log" for select
  using (public.is_admin());
--> statement-breakpoint

-- No insert/update/delete policy for authenticated/anon at all: RLS defaults to
-- deny when no policy matches a given command, so this table is read-only to
-- anyone going through the Data API, even admins. Writes only ever happen via
-- domain/audit/service.ts through the app's own DATABASE_URL connection.
revoke insert, update, delete on table "audit_log" from "authenticated", "anon";
