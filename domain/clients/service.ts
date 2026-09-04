import { db } from "@/db/client";
import { clients, type Client } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClientSchema, type CreateClientInput } from "./schema";

export async function createClient(input: CreateClientInput): Promise<Client> {
  const parsed = createClientSchema.parse(input);
  const [row] = await db.insert(clients).values(parsed).returning();
  return row;
}

export async function getClientById(id: string): Promise<Client | null> {
  const [row] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return row ?? null;
}
