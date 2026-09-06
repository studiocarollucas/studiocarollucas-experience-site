import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  productionJobs,
  shoots,
  clients,
  experiencePackages,
  profiles,
  productionJobStatusEnum,
} from "@/db/schema";

export type ProductionCard = {
  jobId: string;
  shootId: string;
  clientName: string;
  packageName: string;
  shootDate: string;
  status: string;
  editorName: string | null;
  deliveryDueAt: string | null;
  photosToEdit: number | null;
};

export type ProductionBoard = { column: string; cards: ProductionCard[] }[];

// Canonical column order comes straight from the DB enum, so the board can never
// drift from the schema and every status always has a column (empty ones included).
const COLUMNS = productionJobStatusEnum.enumValues;

export function groupJobsByStatus(jobs: ProductionCard[]): ProductionBoard {
  return COLUMNS.map((column) => ({
    column,
    cards: jobs.filter((j) => j.status === column),
  }));
}

export async function getProductionBoard(): Promise<ProductionBoard> {
  const rows = await db
    .select({
      jobId: productionJobs.id,
      shootId: productionJobs.shootId,
      clientName: clients.name,
      packageName: experiencePackages.name,
      shootDate: shoots.shootDate,
      status: productionJobs.status,
      editorName: profiles.fullName,
      deliveryDueAt: productionJobs.deliveryDueAt,
      photosToEdit: productionJobs.photosToEdit,
    })
    .from(productionJobs)
    .innerJoin(shoots, eq(productionJobs.shootId, shoots.id))
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .leftJoin(profiles, eq(productionJobs.editorUserId, profiles.id));

  return groupJobsByStatus(rows);
}
