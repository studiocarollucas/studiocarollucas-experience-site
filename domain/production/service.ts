import { db } from "@/db/client";
import { productionJobs, shoots, type ProductionJob } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createProductionJobSchema, type CreateProductionJobInput } from "./schema";
import { canTransitionProductionStatus, type ProductionJobStatus } from "./status";
import { canTransitionShootStatus } from "@/domain/shoots/status";

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

export async function changeProductionJobStatus(
  jobId: string,
  to: ProductionJobStatus,
): Promise<{ job: ProductionJob; shootStatusChanged: string | null }> {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(productionJobs).where(eq(productionJobs.id, jobId)).limit(1);
    if (!current) throw new Error("job inexistente");
    if (!canTransitionProductionStatus(current.status, to)) throw new Error("transição inválida");

    const [job] = await tx
      .update(productionJobs)
      .set({ status: to, ...(to === "entregue" ? { deliveryAt: new Date().toISOString().slice(0, 10) } : {}) })
      .where(eq(productionJobs.id, jobId))
      .returning();

    // PRD §7.6: "Finalizado" on the production job signals Reveal-readiness on the
    // shoot, and "Entregue" signals post-sale. Reflect it in the same transaction,
    // but only when the shoot's own status machine allows the hop — never force it.
    let shootStatusChanged: string | null = null;
    const reflect = to === "finalizado" ? "finalizado" : to === "entregue" ? "entregue" : null;
    if (reflect) {
      const [shoot] = await tx.select().from(shoots).where(eq(shoots.id, job.shootId)).limit(1);
      if (shoot && shoot.status !== reflect && canTransitionShootStatus(shoot.status, reflect as never)) {
        await tx.update(shoots).set({ status: reflect as never }).where(eq(shoots.id, job.shootId));
        shootStatusChanged = reflect;
      }
    }
    return { job, shootStatusChanged };
  });
}

export async function updateProductionJobFields(
  jobId: string,
  fields: {
    editorUserId?: string | null;
    photosToEdit?: number | null;
    deliveryDueAt?: string | null;
    deliveryAt?: string | null;
    selectionStatus?: string | null;
    notes?: string | null;
  },
): Promise<ProductionJob> {
  const [row] = await db.update(productionJobs).set(fields).where(eq(productionJobs.id, jobId)).returning();
  return row;
}
