import { db } from "@/db/client";
import { auditLog, leads, type AuditLogEntry, type Lead } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { transitionLeadStatusSchema, type TransitionLeadStatusInput } from "./schema";
import { canTransitionLeadStatus } from "./status";

export type LeadDetail = Lead & { audit: AuditLogEntry[] };

export async function getLeadDetail(id: string): Promise<LeadDetail | null> {
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!lead) return null;

  const audit = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.entityId, id))
    .orderBy(desc(auditLog.createdAt));

  return { ...lead, audit };
}

export async function transitionLeadStatus(input: TransitionLeadStatusInput): Promise<Lead> {
  const parsed = transitionLeadStatusSchema.parse(input);
  if (parsed.status === "perdido" && !parsed.lostReason) {
    throw new Error("Informe o motivo da perda");
  }

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(leads).where(eq(leads.id, parsed.leadId)).limit(1);
    if (!current || !canTransitionLeadStatus(current.status, parsed.status)) {
      throw new Error("Transição de Lead inválida");
    }

    const [updated] = await tx
      .update(leads)
      .set({ status: parsed.status, lostReason: parsed.status === "perdido" ? parsed.lostReason : null })
      .where(eq(leads.id, parsed.leadId))
      .returning();

    await tx.insert(auditLog).values({
      actorUserId: parsed.actorUserId,
      action: "lead.status_changed",
      entityType: "lead",
      entityId: updated.id,
      before: { status: current.status, lostReason: current.lostReason },
      after: { status: updated.status, lostReason: updated.lostReason },
    });

    return updated;
  });
}
