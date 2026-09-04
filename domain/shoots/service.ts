import { db } from "@/db/client";
import { shoots, type Shoot } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createShootSchema, type CreateShootInput } from "./schema";

export async function createShoot(input: CreateShootInput): Promise<Shoot> {
  const parsed = createShootSchema.parse(input);
  const [row] = await db.insert(shoots).values(parsed).returning();
  return row;
}

export async function getShootById(id: string): Promise<Shoot | null> {
  const [row] = await db.select().from(shoots).where(eq(shoots.id, id)).limit(1);
  return row ?? null;
}
