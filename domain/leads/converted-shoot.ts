import { db } from "@/db/client";
import { leadConversions, type Shoot } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recordAuditEvent } from "@/domain/audit/service";
import { createConfirmedShoot } from "@/domain/shoots/create-confirmed-shoot";
import type { CreateShootInput } from "@/domain/shoots/schema";

type CreateConfirmedShootFromLeadInput = {
  leadId: string;
  actorUserId: string;
  shoot: Omit<CreateShootInput, "clientId">;
};

async function getLeadConversion(leadId: string) {
  const [conversion] = await db
    .select({ clientId: leadConversions.clientId })
    .from(leadConversions)
    .where(eq(leadConversions.leadId, leadId))
    .limit(1);
  return conversion;
}

export async function createConfirmedShootFromLead(
  input: CreateConfirmedShootFromLeadInput,
): Promise<{ shoot: Shoot }> {
  const conversion = await getLeadConversion(input.leadId);
  if (!conversion) throw new Error("Cliente ainda não foi definido para este Lead.");

  const result = await createConfirmedShoot({ ...input.shoot, clientId: conversion.clientId }, {
    onCreated: async ({ shoot }, tx) => recordAuditEvent({
      actorUserId: input.actorUserId,
      action: "lead.shoot_created",
      entityType: "lead",
      entityId: input.leadId,
      after: { shootId: shoot.id },
    }, tx),
  });

  return { shoot: result.shoot };
}
