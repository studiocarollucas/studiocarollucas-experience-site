import "server-only";

import { sql } from "drizzle-orm";
import type { db } from "@/db/client";

type CurationTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function lockCuration(tx: CurationTransaction) {
  // All paths that can change published membership acquire this before row locks.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('paixao-clutch-curation', 0))`);
}
