import { db } from "@/db/client";
import { auditLog, type AuditLogEntry } from "@/db/schema";

type RecordAuditEventInput = {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
};

export async function recordAuditEvent(input: RecordAuditEventInput): Promise<AuditLogEntry> {
  const [row] = await db
    .insert(auditLog)
    .values({
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before ?? null,
      after: input.after ?? null,
    })
    .returning();
  return row;
}
