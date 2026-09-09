import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";

export async function requireInventoryCatalogActor(actorUserId: string): Promise<void> {
  const [actor] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, actorUserId))
    .limit(1);

  if (!actor || (actor.role !== "staff" && actor.role !== "admin")) {
    throw new Error("ator não autorizado para catálogo de acervo");
  }
}
