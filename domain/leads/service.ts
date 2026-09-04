import { db } from "@/db/client";
import { leads, type Lead } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createLeadSchema, type CreateLeadInput } from "./schema";

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const parsed = createLeadSchema.parse(input);
  const [row] = await db.insert(leads).values(parsed).returning();
  return row;
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return row ?? null;
}
