-- Postgres does not auto-index foreign-key columns; only PRIMARY KEY and UNIQUE
-- constraints get an implicit index. Before this migration, a live pg_indexes query
-- showed the public schema had nothing but the 10 primary keys plus the two
-- UNIQUE-backed indexes (clients_auth_user_id_unique, production_jobs_shoot_id_unique).
-- That means every getXByShootId()-style lookup, and every FK integrity check
-- Postgres performs on a parent-row delete/update, was a sequential scan.
--
-- Those two existing UNIQUE constraints are deliberately NOT re-indexed here: their
-- implicit indexes already cover clients.auth_user_id and production_jobs.shoot_id.

create index "clients_referrer_client_id_idx" on "clients" ("referrer_client_id");
--> statement-breakpoint
create index "leads_client_id_idx" on "leads" ("client_id");
--> statement-breakpoint
create index "leads_owner_idx" on "leads" ("owner");
--> statement-breakpoint
create index "shoots_client_id_idx" on "shoots" ("client_id");
--> statement-breakpoint
create index "shoots_experience_package_id_idx" on "shoots" ("experience_package_id");
--> statement-breakpoint
-- Not a FK: the agenda/calendar views in Epic 2 filter and order by shoot_date.
create index "shoots_shoot_date_idx" on "shoots" ("shoot_date");
--> statement-breakpoint
create index "payments_shoot_id_idx" on "payments" ("shoot_id");
--> statement-breakpoint
create index "preparation_tasks_shoot_id_idx" on "preparation_tasks" ("shoot_id");
--> statement-breakpoint
create index "production_jobs_editor_user_id_idx" on "production_jobs" ("editor_user_id");
--> statement-breakpoint
create index "audit_log_actor_user_id_idx" on "audit_log" ("actor_user_id");
--> statement-breakpoint
-- Composite: the audit trail is read as "everything that happened to THIS entity".
create index "audit_log_entity_idx" on "audit_log" ("entity_type", "entity_id");
--> statement-breakpoint
-- Descending: the audit trail is read newest-first.
create index "audit_log_created_at_idx" on "audit_log" ("created_at" desc);
