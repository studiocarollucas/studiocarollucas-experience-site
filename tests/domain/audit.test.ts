import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { recordAuditEvent } from "@/domain/audit/service";

// CI (.github/workflows/ci.yml) runs `npm run test` with no DATABASE_URL, and
// .env.local is never committed, so there's no way for this suite to reach a real
// database there. Skip the live-DB integration test entirely when DATABASE_URL is
// unset rather than letting it fail with a connection error — opt-in until this
// project has a dedicated CI/test database (see docs/DECISIONS.md).
const describeIfLiveDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfLiveDb("recordAuditEvent", () => {
  const testEntityId = "00000000-0000-0000-0000-0000000000aa";

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
