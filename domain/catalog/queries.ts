import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { experienceFamilies, experiencePackages } from "@/db/schema";

export type PackageOption = {
  id: string;
  name: string;
  familyName: string;
};

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
