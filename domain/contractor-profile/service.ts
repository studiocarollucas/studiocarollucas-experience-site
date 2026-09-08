import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contractorProfiles, type ContractorProfile } from "@/db/schema";
import {
  contractorProfileSchema,
  type ContractorProfileData,
  type ContractorProfileInput,
} from "./schema";

export async function getActiveContractorProfile(): Promise<ContractorProfile | null> {
  const [profile] = await db
    .select()
    .from(contractorProfiles)
    .where(eq(contractorProfiles.scope, "active"))
    .limit(1);
  return profile ?? null;
}

export async function upsertActiveContractorProfile(
  input: ContractorProfileInput,
): Promise<ContractorProfile> {
  const profile = contractorProfileSchema.parse(input);
  return persistActiveContractorProfile(profile);
}

async function persistActiveContractorProfile(profile: ContractorProfileData): Promise<ContractorProfile> {
  const [row] = await db
    .insert(contractorProfiles)
    .values({ scope: "active", ...profile })
    .onConflictDoUpdate({
      target: contractorProfiles.scope,
      set: { ...profile, updatedAt: new Date() },
    })
    .returning();

  if (!row) throw new Error("não foi possível salvar o perfil da contratante");
  return row;
}
