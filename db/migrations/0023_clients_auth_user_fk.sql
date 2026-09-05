-- db/schema/clients.ts's comment already claimed this relationship ("References
-- auth.users directly ... because that's the stable Supabase-managed identity"), but
-- no actual constraint existed — a live pg_constraint query showed only
-- clients_auth_user_id_unique on that column. Nothing stopped an auth_user_id
-- pointing at a user that never existed or has since been deleted.
--
-- Cross-schema FK (public.clients -> auth.users), following the precedent
-- 0002_handle_new_user_trigger.sql set for profiles.id. ON DELETE SET NULL, not
-- CASCADE: the column is already nullable and the schema comment states a Client
-- business record can exist before the person ever logs in. Deleting the auth user
-- should revoke portal access, never destroy the CRM record (and with it the
-- shoots/payments that FK into it).

alter table "clients" add constraint "clients_auth_user_id_fkey"
  foreign key ("auth_user_id") references "auth"."users"("id") on delete set null;
