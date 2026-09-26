// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// Live-DB tests are opt-in (RUN_LIVE_DB_TESTS=true), never armed by DATABASE_URL
// alone. They expect migration 0051 applied to a dev/staging project and only
// read the catalog, so they never touch real clients, leads or referrals.
const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("reviews and referrals (live database)", () => {
  it("enforces referral uniqueness and consistency constraints", async () => {
    const rows = await db.execute(sql`
      select conname
      from pg_constraint
      where conrelid = 'public.referrals'::regclass
        and conname in (
          'referrals_referred_client_id_unique',
          'referrals_lead_id_unique',
          'referrals_not_self',
          'referrals_has_referred',
          'referrals_converted_consistent'
        )
      order by conname
    `);

    expect(Array.from(rows).map((row) => row.conname)).toEqual([
      "referrals_converted_consistent",
      "referrals_has_referred",
      "referrals_lead_id_unique",
      "referrals_not_self",
      "referrals_referred_client_id_unique",
    ]);
  });

  it("installs the integrity triggers", async () => {
    const rows = await db.execute(sql`
      select tgname
      from pg_trigger
      where not tgisinternal
        and tgname in ('referrals_guard_graph', 'reviews_shoot_matches_client', 'clients_referrer_client_id_frozen')
      order by tgname
    `);

    expect(Array.from(rows).map((row) => row.tgname)).toEqual([
      "clients_referrer_client_id_frozen",
      "referrals_guard_graph",
      "reviews_shoot_matches_client",
    ]);
  });

  it("keeps both tables behind RLS with staff policies and nothing for anon", async () => {
    const tables = await db.execute(sql`
      select relname, relrowsecurity
      from pg_class
      where oid in ('public.reviews'::regclass, 'public.referrals'::regclass)
      order by relname
    `);
    expect(Array.from(tables)).toEqual([
      { relname: "referrals", relrowsecurity: true },
      { relname: "reviews", relrowsecurity: true },
    ]);

    const policies = await db.execute(sql`
      select tablename, policyname
      from pg_policies
      where schemaname = 'public' and tablename in ('reviews', 'referrals')
      order by tablename
    `);
    expect(Array.from(policies)).toEqual([
      { tablename: "referrals", policyname: "referrals_staff_access" },
      { tablename: "reviews", policyname: "reviews_staff_access" },
    ]);

    const anonGrants = await db.execute(sql`
      select privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and table_name in ('reviews', 'referrals') and grantee = 'anon'
    `);
    expect(Array.from(anonGrants)).toEqual([]);
  });
});
