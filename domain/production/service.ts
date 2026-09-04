import { db } from "@/db/client";
import { productionJobs, type ProductionJob } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createProductionJobSchema, type CreateProductionJobInput } from "./schema";

export async function createProductionJob(input: CreateProductionJobInput): Promise<ProductionJob> {
  const parsed = createProductionJobSchema.parse(input);
  const [row] = await db.insert(productionJobs).values(parsed).returning();
  return row;
}

export async function getProductionJobByShootId(shootId: string): Promise<ProductionJob | null> {
  const [row] = await db
    .select()
    .from(productionJobs)
    .where(eq(productionJobs.shootId, shootId))
    .limit(1);
  return row ?? null;
}
