import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { experienceFamilies, experiencePackages } from "@/db/schema";

export type PackageOption = {
  id: string;
  name: string;
  familyName: string;
};

export type CatalogPackageRow = {
  id: string;
  familyId: string | null;
  familyName: string | null;
  name: string;
  basePrice: string;
  outfitsLimit: number | null;
  active: boolean;
  published: boolean;
  quizEligible: boolean;
};

export function canDeactivateExperienceFamily(activePackageCount: number) {
  return activePackageCount === 0;
}

export async function countActivePackagesInFamily(familyId: string) {
  const rows = await db
    .select({ id: experiencePackages.id })
    .from(experiencePackages)
    .where(and(eq(experiencePackages.familyId, familyId), eq(experiencePackages.active, true)));
  return rows.length;
}

export async function listFamilies() {
  return db
    .select({
      id: experienceFamilies.id,
      name: experienceFamilies.name,
      slug: experienceFamilies.slug,
      description: experienceFamilies.description,
      sortOrder: experienceFamilies.sortOrder,
      active: experienceFamilies.active,
      published: experienceFamilies.published,
    })
    .from(experienceFamilies)
    .orderBy(asc(experienceFamilies.sortOrder), asc(experienceFamilies.name));
}

export async function listCatalogPackages(): Promise<CatalogPackageRow[]> {
  return db
    .select({
      id: experiencePackages.id,
      familyId: experiencePackages.familyId,
      familyName: experienceFamilies.name,
      name: experiencePackages.name,
      basePrice: experiencePackages.basePrice,
      outfitsLimit: experiencePackages.outfitsLimit,
      active: experiencePackages.active,
      published: experiencePackages.published,
      quizEligible: experiencePackages.quizEligible,
    })
    .from(experiencePackages)
    .leftJoin(experienceFamilies, eq(experiencePackages.familyId, experienceFamilies.id))
    .orderBy(asc(experienceFamilies.sortOrder), asc(experiencePackages.sortOrder), asc(experiencePackages.name));
}

export function sortPackageOptions<
  T extends { familySortOrder: number; packageSortOrder: number; name: string },
>(options: T[]): T[] {
  return [...options].sort(
    (a, b) =>
      a.familySortOrder - b.familySortOrder ||
      a.packageSortOrder - b.packageSortOrder ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
}

export async function listActivePackages(): Promise<PackageOption[]> {
  return db
    .select({
      id: experiencePackages.id,
      name: experiencePackages.name,
      familyName: experienceFamilies.name,
      familySortOrder: experienceFamilies.sortOrder,
      packageSortOrder: experiencePackages.sortOrder,
    })
    .from(experiencePackages)
    .innerJoin(experienceFamilies, eq(experiencePackages.familyId, experienceFamilies.id))
    .where(
      and(
        eq(experiencePackages.active, true),
        eq(experienceFamilies.active, true),
        isNotNull(experiencePackages.familyId),
      ),
    )
    .orderBy(asc(experienceFamilies.sortOrder), asc(experiencePackages.sortOrder), asc(experiencePackages.name))
    .then(sortPackageOptions);
}
