import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { galleries, galleryAssets, type Gallery } from "@/db/schema";

export async function getGalleryForShoot(shootId: string) {
  const [gallery] = await db.select().from(galleries).where(eq(galleries.shootId, shootId)).limit(1);
  if (!gallery) return null;

  const assets = await db
    .select()
    .from(galleryAssets)
    .where(eq(galleryAssets.galleryId, gallery.id))
    .orderBy(asc(galleryAssets.sortOrder), asc(galleryAssets.createdAt));

  return { ...gallery, assets };
}

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
