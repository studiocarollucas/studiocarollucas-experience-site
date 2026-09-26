import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0051_reviews_referrals.sql");
const snapshotPath = path.resolve("db/migrations/meta/0051_snapshot.json");
const previousSnapshotPath = path.resolve("db/migrations/meta/0050_snapshot.json");
const journalPath = path.resolve("db/migrations/meta/_journal.json");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
const normalizedSql = sql.toLowerCase().replace(/\s+/g, " ");

describe("reviews and referrals migration", () => {
  it("creates the review status enum and the reviews table linked to Client and optional Shoot", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(normalizedSql).toContain(
      'create type "public"."review_status" as enum(\'solicitado\', \'concluido\', \'cancelado\')',
    );
    expect(normalizedSql).toContain('create table "reviews"');
    expect(normalizedSql).toContain('"client_id" uuid not null');
    expect(normalizedSql).toContain('"shoot_id" uuid,');
    expect(normalizedSql).toContain('"status" "review_status" default \'solicitado\' not null');
    expect(normalizedSql).toContain('"requested_at" timestamp with time zone,');
    expect(normalizedSql).toContain('"completed_at" timestamp with time zone,');
    expect(normalizedSql).toContain('"target_url" text,');
    expect(normalizedSql).toContain(
      'alter table "reviews" add constraint "reviews_client_id_clients_id_fk" foreign key ("client_id") references "public"."clients"("id") on delete cascade on update no action',
    );
    expect(normalizedSql).toContain(
      'alter table "reviews" add constraint "reviews_shoot_id_shoots_id_fk" foreign key ("shoot_id") references "public"."shoots"("id") on delete set null on update no action',
    );
  });

  it("keeps review status, dates, source and target consistent", () => {
    expect(normalizedSql).toContain(
      'constraint "reviews_source_valid" check ("reviews"."source" in (\'manual\', \'automacao\', \'portal\'))',
    );
    expect(normalizedSql).toContain(
      'constraint "reviews_target_valid" check ("reviews"."target" in (\'google\', \'instagram\', \'interno\', \'outro\'))',
    );
    expect(normalizedSql).toContain(
      'constraint "reviews_requested_has_requested_at" check ("reviews"."status" <> \'solicitado\' or "reviews"."requested_at" is not null)',
    );
    expect(normalizedSql).toContain(
      'constraint "reviews_completed_has_completed_at" check (("reviews"."status" = \'concluido\') = ("reviews"."completed_at" is not null))',
    );
    expect(normalizedSql).toContain('constraint "reviews_completed_after_requested" check');
    expect(normalizedSql).toContain(
      'create unique index "reviews_one_active_per_shoot_target_idx" on "reviews" using btree ("shoot_id","target") where "reviews"."shoot_id" is not null and "reviews"."status" <> \'cancelado\';',
    );
    expect(normalizedSql).toContain("create trigger reviews_shoot_matches_client before insert or update of client_id, shoot_id on public.reviews");
    expect(normalizedSql).toContain("where shoots.id = new.shoot_id and shoots.client_id = new.client_id");
  });

  it("creates referrals with one referrer per referred client and per lead", () => {
    expect(normalizedSql).toContain('create table "referrals"');
    expect(normalizedSql).toContain('"referrer_client_id" uuid not null');
    expect(normalizedSql).toContain('"referred_client_id" uuid,');
    expect(normalizedSql).toContain('"lead_id" uuid,');
    expect(normalizedSql).toContain('"converted_at" timestamp with time zone');
    expect(normalizedSql).toContain('constraint "referrals_referred_client_id_unique" unique("referred_client_id")');
    expect(normalizedSql).toContain('constraint "referrals_lead_id_unique" unique("lead_id")');
    expect(normalizedSql).toContain(
      'alter table "referrals" add constraint "referrals_referrer_client_id_clients_id_fk" foreign key ("referrer_client_id") references "public"."clients"("id") on delete no action on update no action',
    );
    expect(normalizedSql).toContain(
      'alter table "referrals" add constraint "referrals_referred_client_id_clients_id_fk" foreign key ("referred_client_id") references "public"."clients"("id") on delete no action on update no action',
    );
    expect(normalizedSql).toContain(
      'alter table "referrals" add constraint "referrals_lead_id_leads_id_fk" foreign key ("lead_id") references "public"."leads"("id") on delete cascade on update no action',
    );
    expect(normalizedSql).toContain(
      'create index "referrals_referrer_client_idx" on "referrals" using btree ("referrer_client_id")',
    );
  });

  it("rejects self-referral, orphan referrals and converted flags without a client", () => {
    expect(normalizedSql).toContain(
      'constraint "referrals_not_self" check ("referrals"."referrer_client_id" <> "referrals"."referred_client_id")',
    );
    expect(normalizedSql).toContain(
      'constraint "referrals_has_referred" check ("referrals"."referred_client_id" is not null or "referrals"."lead_id" is not null)',
    );
    expect(normalizedSql).toContain(
      'constraint "referrals_lead_source_has_lead" check ("referrals"."source" <> \'lead\' or "referrals"."lead_id" is not null)',
    );
    expect(normalizedSql).toContain(
      'constraint "referrals_converted_consistent" check (("referrals"."referred_client_id" is null) = ("referrals"."converted_at" is null))',
    );
    expect(normalizedSql).toContain(
      'constraint "referrals_source_valid" check ("referrals"."source" in (\'lead\', \'cliente\', \'legado\'))',
    );
  });

  it("rejects referral cycles under a serializing advisory lock", () => {
    expect(normalizedSql).toContain(
      "create trigger referrals_guard_graph before insert or update of referrer_client_id, referred_client_id on public.referrals",
    );
    expect(normalizedSql).toContain("pg_catalog.pg_advisory_xact_lock( pg_catalog.hashtextextended('public.referrals', 0) )");
    expect(normalizedSql).toContain("constraint = 'referrals_no_cycle'");
    expect(normalizedSql).toContain("and referrals.id <> new.id");
    for (const fn of ["reviews_shoot_matches_client", "referrals_guard_graph", "clients_referrer_client_id_frozen"]) {
      expect(normalizedSql).toContain(`create or replace function private.${fn}()`);
      expect(normalizedSql).toContain(`revoke all on function private.${fn}() from public, anon, authenticated;`);
    }
  });

  it("copies the legacy clients.referrer_client_id into referrals and freezes the column", () => {
    expect(normalizedSql).toContain(
      "insert into public.referrals (referrer_client_id, referred_client_id, source, created_at, converted_at) select c.referrer_client_id, c.id, 'legado', c.created_at, c.created_at from public.clients c where c.referrer_client_id is not null and c.referrer_client_id <> c.id",
    );
    expect(normalizedSql).toContain(
      "create trigger clients_referrer_client_id_frozen before insert or update of referrer_client_id on public.clients",
    );
    // The graph guard must exist before the backfill so legacy cycles cannot slip in.
    expect(normalizedSql.indexOf("create trigger referrals_guard_graph")).toBeLessThan(
      normalizedSql.indexOf("insert into public.referrals"),
    );
    expect(normalizedSql).not.toMatch(/drop column|alter table "clients" drop/);
  });

  it("limits both tables to staff/admin through RLS and grants nothing to anon", () => {
    for (const table of ["reviews", "referrals"]) {
      expect(normalizedSql).toContain(`alter table public.${table} enable row level security;`);
      expect(normalizedSql).toContain(`revoke all on table public.${table} from anon, authenticated;`);
      expect(normalizedSql).toContain(`grant select, insert, update, delete on table public.${table} to authenticated;`);
      expect(normalizedSql).toContain(
        `create policy ${table}_staff_access on public.${table} for all to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());`,
      );
    }
    expect(normalizedSql).toContain("revoke all on type public.review_status from public, anon, authenticated;");
    expect(normalizedSql).toContain("grant usage on type public.review_status to authenticated, service_role;");
    expect(normalizedSql).not.toMatch(/grant [a-z, ]+ to anon/);
    expect(normalizedSql).not.toContain("to anon");
  });

  it("records the new tables and enum in the chained snapshot and journal", () => {
    expect(fs.existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const previous = JSON.parse(fs.readFileSync(previousSnapshotPath, "utf8"));
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
    const reviews = snapshot.tables["public.reviews"];
    const referrals = snapshot.tables["public.referrals"];

    expect(snapshot.prevId).toBe(previous.id);
    expect(snapshot.id).not.toBe(previous.id);
    expect(Object.keys(snapshot.tables)).toEqual([...Object.keys(previous.tables), "public.reviews", "public.referrals"]);
    expect(snapshot.tables["public.clients"]).toEqual(previous.tables["public.clients"]);
    expect(Object.keys(snapshot.enums)).toEqual([...Object.keys(previous.enums), "public.review_status"]);
    expect(snapshot.enums["public.review_status"].values).toEqual(["solicitado", "concluido", "cancelado"]);

    expect(reviews.columns.status).toMatchObject({ type: "review_status", typeSchema: "public", notNull: true, default: "'solicitado'" });
    expect(reviews.columns.shoot_id).toMatchObject({ type: "uuid", notNull: false });
    expect(Object.keys(reviews.foreignKeys)).toEqual(["reviews_client_id_clients_id_fk", "reviews_shoot_id_shoots_id_fk"]);
    expect(reviews.foreignKeys.reviews_shoot_id_shoots_id_fk.onDelete).toBe("set null");
    expect(reviews.indexes.reviews_one_active_per_shoot_target_idx).toMatchObject({
      isUnique: true,
      where: "\"reviews\".\"shoot_id\" is not null and \"reviews\".\"status\" <> 'cancelado'",
    });
    expect(Object.keys(reviews.checkConstraints)).toEqual([
      "reviews_source_valid",
      "reviews_target_valid",
      "reviews_requested_has_requested_at",
      "reviews_completed_has_completed_at",
      "reviews_completed_after_requested",
    ]);

    expect(referrals.uniqueConstraints.referrals_referred_client_id_unique.columns).toEqual(["referred_client_id"]);
    expect(referrals.uniqueConstraints.referrals_lead_id_unique.columns).toEqual(["lead_id"]);
    expect(Object.keys(referrals.foreignKeys)).toEqual([
      "referrals_referrer_client_id_clients_id_fk",
      "referrals_referred_client_id_clients_id_fk",
      "referrals_lead_id_leads_id_fk",
    ]);
    expect(Object.keys(referrals.checkConstraints)).toEqual([
      "referrals_source_valid",
      "referrals_has_referred",
      "referrals_lead_source_has_lead",
      "referrals_not_self",
      "referrals_converted_consistent",
    ]);

    const position = journal.entries.findIndex((entry: { tag: string }) => entry.tag === "0051_reviews_referrals");
    const entry = journal.entries[position];
    expect(entry).toMatchObject({ idx: 51, version: "7", tag: "0051_reviews_referrals", breakpoints: true });
    expect(entry.when).toBeGreaterThan(journal.entries[position - 1].when);
  });
});
