import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { experiencePackages } from "@/db/schema";

export async function listActivePackages(): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: experiencePackages.id, name: experiencePackages.name })
    .from(experiencePackages)
    .where(eq(experiencePackages.active, true))
    .orderBy(asc(experiencePackages.name));
}
