import { db } from "@/db/client";
import { clients, type Client } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createClientSchema,
  updateClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
} from "./schema";

export async function createClient(input: CreateClientInput): Promise<Client> {
  const parsed = createClientSchema.parse(input);
  const [row] = await db.insert(clients).values(parsed).returning();
  return row;
}

export async function getClientById(id: string): Promise<Client | null> {
  const [row] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return row ?? null;
}

export async function updateClient(id: string, input: UpdateClientInput): Promise<Client> {
  const parsed = updateClientSchema.parse(input);
  // MVP limitation: an optional field cannot be blanked back to null here —
  // toFormAction drops empty strings, so a cleared field simply stays unchanged.
  if (Object.keys(parsed).length === 0) {
    const existing = await getClientById(id);
    if (!existing) throw new Error("cliente inexistente");
    return existing;
  }
  const [row] = await db.update(clients).set(parsed).where(eq(clients.id, id)).returning();
  return row;
}
