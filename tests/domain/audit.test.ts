import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";

// Live-DB tests are gated on an explicit, dedicated opt-in — NOT on DATABASE_URL.
// DATABASE_URL is needed for ordinary local development (dev server, db:migrate), so
// gating on it alone silently armed these write/delete tests against whatever
// database .env.local points at — today, the project's only real Supabase project.
// RUN_LIVE_DB_TESTS must be set to the literal "true" as well. See docs/DECISIONS.md
// and .env.example.
const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;

describeIfLiveDb("recordAuditEvent", () => {
  // v4-shaped placeholder, matching the convention every other test file uses.
  const testEntityId = "00000000-0000-4000-8000-0000000000aa";

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.entityId, testEntityId));
  });

  it("persists an audit entry with before/after snapshots", async () => {
    const entry = await recordAuditEvent({
      actorUserId: null,
      action: "shoot.status_changed",
      entityType: "shoot",
      entityId: testEntityId,
      before: { status: "reserva" },
      after: { status: "preparacao" },
    });

    expect(entry.id).toBeDefined();
    expect(entry.action).toBe("shoot.status_changed");
    expect(entry.before).toEqual({ status: "reserva" });
    expect(entry.after).toEqual({ status: "preparacao" });
  });
});
