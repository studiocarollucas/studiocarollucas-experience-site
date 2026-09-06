import { db } from "@/db/client";
import { shoots, type Shoot } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createShootSchema,
  updateShootSchema,
  type CreateShootInput,
  type UpdateShootInput,
} from "./schema";

export async function createShoot(input: CreateShootInput): Promise<Shoot> {
  const parsed = createShootSchema.parse(input);
  const [row] = await db.insert(shoots).values(parsed).returning();
  return row;
}

export async function getShootById(id: string): Promise<Shoot | null> {
  const [row] = await db.select().from(shoots).where(eq(shoots.id, id)).limit(1);
  return row ?? null;
}

export async function updateShoot(id: string, input: UpdateShootInput): Promise<Shoot> {
  const parsed = updateShootSchema.parse(input);
  // Empty patch: Drizzle `.set({})` throws, so short-circuit to the current row.
  if (Object.keys(parsed).length === 0) {
    const existing = await getShootById(id);
    if (!existing) throw new Error("ensaio inexistente");
    return existing;
  }
  const [row] = await db.update(shoots).set(parsed).where(eq(shoots.id, id)).returning();
  return row;
}
