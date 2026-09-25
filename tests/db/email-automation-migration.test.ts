import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve("db/migrations/0049_email_automation_outbox.sql");
const snapshotPath = path.resolve("db/migrations/meta/0049_snapshot.json");
const previousSnapshotPath = path.resolve("db/migrations/meta/0048_snapshot.json");
const journalPath = path.resolve("db/migrations/meta/_journal.json");
const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
const normalizedSql = sql.toLowerCase().replace(/\s+/g, " ");

describe("email automation outbox migration", () => {
  it("creates the delivery enums, events and deliveries tables", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(normalizedSql).toContain('create type "public"."notification_channel" as enum(\'email\')');
    expect(normalizedSql).toContain(
      'create type "public"."notification_delivery_status" as enum(\'pending\', \'sending\', \'retry\', \'sent\', \'failed\', \'cancelled\')',
    );
    expect(normalizedSql).toContain('create table "automation_events"');
    expect(normalizedSql).toContain('create table "notification_deliveries"');
    expect(normalizedSql).toContain('"status" "notification_delivery_status" default \'pending\' not null');
    expect(normalizedSql).toContain('"attempt_count" integer default 0 not null');
    expect(normalizedSql).toContain('"max_attempts" integer default 5 not null');
    expect(normalizedSql).toContain('"next_attempt_at" timestamp with time zone default now() not null');
    expect(normalizedSql).toContain('"last_error" text');
  });

  it("enforces idempotency per event key and per event/template/recipient", () => {
    expect(normalizedSql).toContain('constraint "automation_events_idempotency_key_unique" unique("idempotency_key")');
    expect(normalizedSql).toContain(
      'constraint "notification_deliveries_event_template_recipient_unique" unique("event_id","template_key","recipient")',
    );
    expect(normalizedSql).toContain(
      'constraint "notification_deliveries_attempts_valid" check ("notification_deliveries"."attempt_count" >= 0 and "notification_deliveries"."max_attempts" > 0)',
    );
    expect(normalizedSql).toContain(
      'constraint "notification_deliveries_sent_has_sent_at" check ("notification_deliveries"."status" <> \'sent\' or "notification_deliveries"."sent_at" is not null)',
    );
    expect(normalizedSql).toContain(
      'alter table "notification_deliveries" add constraint "notification_deliveries_event_id_automation_events_id_fk" foreign key ("event_id") references "public"."automation_events"("id") on delete no action on update no action',
    );
    expect(normalizedSql).toContain(
      'create index "notification_deliveries_due_idx" on "notification_deliveries" using btree ("status","next_attempt_at")',
    );
  });

  it("keeps both tables server-only: RLS on, nothing granted to anon/authenticated", () => {
    for (const table of ["automation_events", "notification_deliveries"]) {
      expect(normalizedSql).toContain(`alter table "${table}" enable row level security;`);
      expect(normalizedSql).toContain(`revoke all on table "${table}" from anon, authenticated;`);
      expect(normalizedSql).not.toMatch(new RegExp(`grant [a-z, ]+ on table "${table}"`));
    }
    for (const enumName of ["notification_channel", "notification_delivery_status"]) {
      expect(normalizedSql).toContain(`revoke all on type public.${enumName} from public, anon, authenticated;`);
    }
    expect(normalizedSql).not.toContain("create policy");
    expect(normalizedSql).not.toContain("to authenticated");
  });

  it("records the new tables in the chained snapshot and journal", () => {
    expect(fs.existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    const previous = JSON.parse(fs.readFileSync(previousSnapshotPath, "utf8"));
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
    const events = snapshot.tables["public.automation_events"];
    const deliveries = snapshot.tables["public.notification_deliveries"];

    expect(snapshot.prevId).toBe(previous.id);
    expect(snapshot.id).not.toBe(previous.id);
    expect(Object.keys(snapshot.tables)).toEqual([
      ...Object.keys(previous.tables),
      "public.automation_events",
      "public.notification_deliveries",
    ]);
    expect(events.uniqueConstraints.automation_events_idempotency_key_unique.columns).toEqual(["idempotency_key"]);
    expect(deliveries.uniqueConstraints.notification_deliveries_event_template_recipient_unique.columns).toEqual([
      "event_id",
      "template_key",
      "recipient",
    ]);
    expect(deliveries.columns.status).toMatchObject({ type: "notification_delivery_status", notNull: true, default: "'pending'" });
    expect(deliveries.columns.next_attempt_at).toMatchObject({ type: "timestamp with time zone", notNull: true, default: "now()" });
    expect(deliveries.indexes.notification_deliveries_due_idx.columns.map((c: { expression: string }) => c.expression)).toEqual([
      "status",
      "next_attempt_at",
    ]);
    expect(snapshot.enums["public.notification_delivery_status"].values).toEqual([
      "pending",
      "sending",
      "retry",
      "sent",
      "failed",
      "cancelled",
    ]);

    const last = journal.entries[journal.entries.length - 1];
    expect(last).toMatchObject({ idx: 49, version: "7", tag: "0049_email_automation_outbox", breakpoints: true });
    expect(last.when).toBeGreaterThan(journal.entries[journal.entries.length - 2].when);
  });
});
