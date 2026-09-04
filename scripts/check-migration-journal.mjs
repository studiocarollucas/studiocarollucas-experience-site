import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Guards against the class of bug fixed in commit e0b33b4: drizzle-orm's migrator
// only applies a migration whose journal "when" exceeds the highest "created_at"
// already recorded in drizzle.__drizzle_migrations. A non-monotonic or
// future-dated "when" causes db:migrate to silently no-op (exit 0, no error,
// nothing applied) instead of failing loudly. This runs as a predb:migrate hook
// so a bad hand-written journal entry is caught before it wastes anyone's time.

const journalPath = fileURLToPath(new URL("../db/migrations/meta/_journal.json", import.meta.url));
const journal = JSON.parse(readFileSync(journalPath, "utf-8"));

let previous = -Infinity;
for (const entry of journal.entries) {
  if (entry.when <= previous) {
    console.error(
      `FATAL: db/migrations/meta/_journal.json entry idx=${entry.idx} (tag=${entry.tag}) has ` +
        `"when"=${entry.when}, which is not strictly greater than the previous entry's "when"=${previous}. ` +
        `This would cause drizzle-orm's migrator to silently skip this migration. ` +
        `Fix: use a real Date.now() timestamp captured when you add the journal entry, not an arbitrary chosen value.`
    );
    process.exit(1);
  }
  previous = entry.when;
}

const now = Date.now();
if (previous > now) {
  console.error(
    `FATAL: db/migrations/meta/_journal.json's newest entry has "when"=${previous} ` +
      `(${new Date(previous).toISOString()}), which is in the future relative to now ` +
      `(${new Date(now).toISOString()}). Any migration generated before real time passes this value ` +
      `will be silently skipped by drizzle-orm's migrator. Fix: correct the timestamp to a real, past value.`
  );
  process.exit(1);
}

console.log("db/migrations/meta/_journal.json: timestamps monotonic and not in the future. OK.");
