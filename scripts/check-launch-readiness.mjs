import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Read-only audit of the environment supplied to this command. Never prints
// connection strings, API keys, recipient data or any environment value.
const root = fileURLToPath(new URL("../", import.meta.url));
const variables = [
  "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_STUDIO_WHATSAPP_URL",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID", "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
  "RESEND_API_KEY", "EMAIL_FROM", "CRON_SECRET", "STUDIO_GOOGLE_REVIEW_URL",
];
const configuration = Object.fromEntries(variables.map((key) => [key, Boolean(process.env[key]?.trim())]));
configuration.EMAIL_DELIVERY_ENABLED = process.env.EMAIL_DELIVERY_ENABLED === "true";
configuration.CRON_SECRET_MIN_LENGTH = (process.env.CRON_SECRET?.length ?? 0) >= 32;
const journal = JSON.parse(readFileSync(join(root, "db/migrations/meta/_journal.json"), "utf8"));
const result = { environment: process.env.VERCEL_ENV || "local", configuration, migrations: null, database: "not_configured" };

if (process.env.DATABASE_URL) {
  let sql;
  try {
    const { default: postgres } = await import("postgres");
    sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10, idle_timeout: 2 });
    const rows = await sql.begin("read only", async (tx) => {
      await tx`set local statement_timeout = '10000ms'`;
      return tx`select hash from drizzle.__drizzle_migrations`;
    });
    const applied = new Set(rows.map((row) => row.hash));
    // Compares the whole journal. A window starting at a fixed index hid an older
    // gap: 0048 was missing while the audit reported only 0049 onward as pending.
    const entries = journal.entries.map((entry) => {
      const bytes = readFileSync(join(root, "db/migrations", `${entry.tag}.sql`));
      return { tag: entry.tag, applied: applied.has(createHash("sha256").update(bytes).digest("hex")) };
    });
    const firstGap = entries.findIndex((entry) => !entry.applied);
    result.migrations = {
      journalEntries: entries.length,
      appliedRows: rows.length,
      lastAppliedInOrder: firstGap === 0 ? null : entries[(firstGap === -1 ? entries.length : firstGap) - 1].tag,
      pending: entries.filter((entry) => !entry.applied).map((entry) => entry.tag),
    };
    result.database = "read_only_check_completed";
  } catch (error) {
    result.database = "unavailable";
    result.databaseErrorCode = /^[A-Z0-9_]+$/i.test(error?.code ?? "") ? error.code : "UNKNOWN";
    process.exitCode = 1;
  } finally {
    if (sql) await sql.end({ timeout: 1 });
  }
}
console.log(JSON.stringify(result, null, 2));
