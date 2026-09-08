import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, contracts, experiencePackages, payments, shoots } from "@/db/schema";

export type ContractIssueContext = {
  shoot: {
    id: string;
    date: string;
    startTime: string | null;
    locationName: string | null;
    locationAddress: string | null;
    agreedPrice: string;
  };
  client: { id: string; name: string; phone: string | null };
  package: {
    name: string;
    description: string | null;
    durationMinutes: number;
    includedPhotos: number;
    scenes: string | null;
  };
  payments: Array<{ amount: string; status: "pendente" | "confirmado" | "estornado" }>;
};

export async function getContractIssueContext(shootId: string): Promise<ContractIssueContext | null> {
  const rows = await db
    .select({
      shootId: shoots.id,
      shootDate: shoots.shootDate,
      startTime: shoots.startTime,
      locationName: shoots.locationName,
      locationAddress: shoots.locationAddress,
      agreedPrice: shoots.agreedPrice,
      clientId: clients.id,
      clientName: clients.name,
      clientPhone: clients.phone,
      packageName: experiencePackages.name,
      packageDescription: experiencePackages.description,
      packageDurationMinutes: experiencePackages.durationMinutes,
      packageIncludedPhotos: experiencePackages.includedPhotos,
      packageScenes: experiencePackages.scenes,
      paymentAmount: payments.amount,
      paymentStatus: payments.status,
    })
    .from(shoots)
    .innerJoin(clients, eq(shoots.clientId, clients.id))
    .innerJoin(experiencePackages, eq(shoots.experiencePackageId, experiencePackages.id))
    .innerJoin(payments, eq(payments.shootId, shoots.id))
    .where(eq(shoots.id, shootId));

  const first = rows[0];
  if (!first) return null;

  return {
    shoot: {
      id: first.shootId,
      date: first.shootDate,
      startTime: first.startTime,
      locationName: first.locationName,
      locationAddress: first.locationAddress,
      agreedPrice: first.agreedPrice,
    },
    client: { id: first.clientId, name: first.clientName, phone: first.clientPhone },
    package: {
      name: first.packageName,
      description: first.packageDescription,
      durationMinutes: first.packageDurationMinutes,
      includedPhotos: first.packageIncludedPhotos,
      scenes: first.packageScenes,
    },
    payments: rows.map((row) => ({ amount: row.paymentAmount, status: row.paymentStatus })),
  };
}

const contractListSelection = {
  id: contracts.id,
  contractNumber: contracts.contractNumber,
  status: contracts.status,
  issuedAt: contracts.issuedAt,
  imageUsageAuthorized: contracts.imageUsageAuthorized,
};

export async function listContractsForShoot(shootId: string) {
  return db
    .select(contractListSelection)
    .from(contracts)
    .where(eq(contracts.shootId, shootId))
    .orderBy(desc(contracts.issuedAt));
}

export async function listContractsForClient(clientId: string) {
  return db
    .select(contractListSelection)
    .from(contracts)
    .where(eq(contracts.clientId, clientId))
    .orderBy(desc(contracts.issuedAt));
}

export async function getContractDownload(id: string): Promise<{ pdfStoragePath: string } | null> {
  const [contract] = await db
    .select({ pdfStoragePath: contracts.pdfStoragePath })
    .from(contracts)
    .where(and(eq(contracts.id, id), eq(contracts.status, "issued")))
    .limit(1);
  return contract ?? null;
}
