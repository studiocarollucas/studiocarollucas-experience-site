import { db } from "@/db/client";
import { auditLog, clients, leadConversions, leads, type Client, type LeadConversion } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";

export type ClientCandidate = Pick<Client, "id" | "name" | "email" | "phone">;

type ConvertWonLeadInput = {
  leadId: string;
  actorUserId: string;
  client: { mode: "existing"; clientId: string } | { mode: "new" };
};

function normalizeText(value: string | null): string | null {
  const normalized = value?.trim().toLocaleLowerCase();
  return normalized || null;
}

function normalizePhone(value: string | null): string | null {
  const normalized = value?.replace(/\D/g, "");
  return normalized || null;
}

export async function findLeadClientCandidates(leadId: string): Promise<ClientCandidate[]> {
  const [lead] = await db
    .select({ name: leads.name, email: leads.email, phone: leads.phone })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  if (!lead) throw new Error("Lead inexistente");

  const matches = [
    normalizeText(lead.name) && sql`lower(trim(${clients.name})) = ${normalizeText(lead.name)}`,
    normalizeText(lead.email) && sql`lower(trim(${clients.email})) = ${normalizeText(lead.email)}`,
    normalizePhone(lead.phone) && sql`regexp_replace(${clients.phone}, '[^0-9]', '', 'g') = ${normalizePhone(lead.phone)}`,
  ].filter((match): match is ReturnType<typeof sql> => Boolean(match));

  if (matches.length === 0) return [];

  return db
    .select({ id: clients.id, name: clients.name, email: clients.email, phone: clients.phone })
    .from(clients)
    .where(or(...matches));
}

export async function convertWonLead(input: ConvertWonLeadInput): Promise<{ client: Client; conversion: LeadConversion }> {
  if (!input.client || (input.client.mode !== "new" && input.client.mode !== "existing")) {
    throw new Error("Escolha um cliente existente ou crie um novo cliente");
  }

  return db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, input.leadId)).limit(1).for("update");
    if (!lead) throw new Error("Lead inexistente");
    if (lead.status !== "ganho") throw new Error("Apenas Leads ganhos podem ser convertidos");

    const [existingConversion] = await tx
      .select()
      .from(leadConversions)
      .where(eq(leadConversions.leadId, input.leadId))
      .limit(1);
    if (existingConversion) {
      const [existingClient] = await tx.select().from(clients).where(eq(clients.id, existingConversion.clientId)).limit(1);
      if (!existingClient) throw new Error("Cliente convertido inexistente");
      return { client: existingClient, conversion: existingConversion };
    }

    let client: Client;
    if (input.client.mode === "existing") {
      const [existingClient] = await tx.select().from(clients).where(eq(clients.id, input.client.clientId)).limit(1);
      if (!existingClient) throw new Error("Cliente inexistente");
      client = existingClient;
    } else {
      if (!lead.name?.trim()) throw new Error("Lead sem nome não pode criar cliente");
      const [createdClient] = await tx
        .insert(clients)
        .values({ name: lead.name, email: lead.email, phone: lead.phone, source: "lead_conversion" })
        .returning();
      client = createdClient;
    }

    const [conversion] = await tx
      .insert(leadConversions)
      .values({ leadId: lead.id, clientId: client.id, convertedByUserId: input.actorUserId })
      .returning();

    await tx.update(leads).set({ clientId: client.id }).where(eq(leads.id, lead.id)).returning();
    await tx.insert(auditLog).values({
      actorUserId: input.actorUserId,
      action: "lead.converted",
      entityType: "lead",
      entityId: lead.id,
      before: { clientId: lead.clientId },
      after: { clientId: client.id },
    }).returning();

    return { client, conversion };
  });
}
