import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { galleries, type Gallery } from "@/db/schema";

export async function getOrCreateGalleryForShoot(shootId: string): Promise<Gallery> {
  const [created] = await db
    .insert(galleries)
    .values({ shootId })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [existing] = await db
    .select()
    .from(galleries)
    .where(eq(galleries.shootId, shootId))
    .limit(1);

  if (!existing) throw new Error("não foi possível obter a galeria do ensaio");
  return existing;
}
