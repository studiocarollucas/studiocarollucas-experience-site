-- profiles.id references auth.users(id) ON DELETE CASCADE (0002_handle_new_user_trigger.sql).
-- But the three columns that reference profiles.id were created with no ON DELETE
-- clause at all, which Postgres defaults to NO ACTION (verified live: pg_constraint
-- .confdeltype = 'a' on all three). Consequence: once a staff member has ever
-- recorded an audit event, owned a lead, or been assigned a production job, deleting
-- their auth.users row fails with a foreign-key violation — the cascade into
-- profiles is blocked by these three children.
--
-- SET NULL is the correct semantics here, not CASCADE: all three columns are already
-- nullable and mean "no longer applicable" when null. audit_log's own schema comment
-- states that a null actor_user_id means a system/automated action — so nulling the
-- actor of a departed staff member's audit entries preserves the audit trail rather
-- than destroying it, which CASCADE would do.
--
-- Deliberately NOT changed (they stay NO ACTION): shoots.client_id,
-- shoots.experience_package_id, payments.shoot_id, preparation_tasks.shoot_id,
-- production_jobs.shoot_id, leads.client_id, clients.referrer_client_id. Those are
-- financial/business records; a blocked delete is the desired outcome there, not a
-- silent vanish or null-out.

alter table "audit_log" drop constraint "audit_log_actor_user_id_fkey";
--> statement-breakpoint
alter table "audit_log" add constraint "audit_log_actor_user_id_fkey"
  foreign key ("actor_user_id") references "profiles"("id") on delete set null;
--> statement-breakpoint
alter table "leads" drop constraint "leads_owner_fkey";
--> statement-breakpoint
alter table "leads" add constraint "leads_owner_fkey"
  foreign key ("owner") references "profiles"("id") on delete set null;
--> statement-breakpoint
alter table "production_jobs" drop constraint "production_jobs_editor_user_id_fkey";
--> statement-breakpoint
alter table "production_jobs" add constraint "production_jobs_editor_user_id_fkey"
  foreign key ("editor_user_id") references "profiles"("id") on delete set null;
