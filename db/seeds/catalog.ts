import { and, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { experienceFamilies } from "../schema/experience-families.ts";
import { experiencePackages } from "../schema/experience-packages.ts";

const queryClient = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(queryClient);

type FamilySeed = { name: string; slug: string; sortOrder: number; published: boolean };
type PackageSeed = {
  familySlug: string;
  name: string;
  basePrice: string;
  includedPhotos: number;
  durationMinutes: number;
  outfitsLimit?: number;
  sceneCount: number;
  participantLimit?: number;
  videoCount: number;
};

const FAMILIES: FamilySeed[] = [
  { name: "15 anos / Debutante", slug: "15-anos", sortOrder: 1, published: true },
  { name: "Aniversário", slug: "aniversario", sortOrder: 2, published: true },
  { name: "Gestante", slug: "gestante", sortOrder: 3, published: true },
  { name: "Newborn", slug: "newborn", sortOrder: 4, published: true },
  { name: "Casal / Namorados", slug: "casal", sortOrder: 5, published: false },
  { name: "Formatura", slug: "formatura", sortOrder: 6, published: false },
  { name: "Marca pessoal", slug: "marca-pessoal", sortOrder: 7, published: false },
  { name: "Corporativo", slug: "corporativo", sortOrder: 8, published: false },
];

const PUBLIC_FAMILY_SLUGS = new Set(["15-anos", "aniversario", "gestante", "newborn"]);

const INITIAL_PACKAGES: PackageSeed[] = [
  { familySlug: "15-anos", name: "Debutante 1", basePrice: "499.00", includedPhotos: 15, durationMinutes: 50, outfitsLimit: 2, sceneCount: 1, videoCount: 1 },
  { familySlug: "15-anos", name: "Debutante 2", basePrice: "599.00", includedPhotos: 20, durationMinutes: 60, outfitsLimit: 3, sceneCount: 2, videoCount: 1 },
  { familySlug: "15-anos", name: "Debutante 3", basePrice: "799.00", includedPhotos: 30, durationMinutes: 60, outfitsLimit: 4, sceneCount: 3, videoCount: 2 },
  { familySlug: "15-anos", name: "Debutante 4 Duo", basePrice: "1500.00", includedPhotos: 40, durationMinutes: 100, outfitsLimit: 4, sceneCount: 3, videoCount: 3 },
  { familySlug: "aniversario", name: "Cinderela", basePrice: "350.00", includedPhotos: 15, durationMinutes: 50, outfitsLimit: 2, sceneCount: 1, videoCount: 0 },
  { familySlug: "aniversario", name: "Aurora", basePrice: "590.00", includedPhotos: 30, durationMinutes: 50, outfitsLimit: 3, sceneCount: 2, videoCount: 1 },
  { familySlug: "aniversario", name: "Diana", basePrice: "800.00", includedPhotos: 40, durationMinutes: 80, outfitsLimit: 4, sceneCount: 3, participantLimit: 3, videoCount: 3 },
  { familySlug: "gestante", name: "Gestante 1", basePrice: "550.00", includedPhotos: 15, durationMinutes: 50, outfitsLimit: 1, sceneCount: 1, participantLimit: 1, videoCount: 0 },
  { familySlug: "gestante", name: "Gestante 2", basePrice: "650.00", includedPhotos: 20, durationMinutes: 80, outfitsLimit: 2, sceneCount: 1, participantLimit: 3, videoCount: 0 },
  { familySlug: "gestante", name: "Gestante 3", basePrice: "899.00", includedPhotos: 30, durationMinutes: 90, outfitsLimit: 2, sceneCount: 2, participantLimit: 4, videoCount: 2 },
  { familySlug: "newborn", name: "Newborn 1", basePrice: "480.00", includedPhotos: 15, durationMinutes: 120, sceneCount: 2, videoCount: 0 },
  { familySlug: "newborn", name: "Newborn 2", basePrice: "780.00", includedPhotos: 25, durationMinutes: 180, sceneCount: 3, videoCount: 1 },
  { familySlug: "newborn", name: "Newborn 3", basePrice: "1500.00", includedPhotos: 35, durationMinutes: 180, sceneCount: 4, videoCount: 2 },
  { familySlug: "newborn", name: "Gestante + Newborn", basePrice: "1900.00", includedPhotos: 40, durationMinutes: 210, outfitsLimit: 2, sceneCount: 4, participantLimit: 4, videoCount: 2 },
  { familySlug: "casal", name: "Namorados 1", basePrice: "350.00", includedPhotos: 15, durationMinutes: 50, outfitsLimit: 2, sceneCount: 1, videoCount: 0 },
  { familySlug: "casal", name: "Namorados 2", basePrice: "550.00", includedPhotos: 25, durationMinutes: 50, outfitsLimit: 1, sceneCount: 1, videoCount: 0 },
  { familySlug: "formatura", name: "Formatura 1", basePrice: "500.00", includedPhotos: 15, durationMinutes: 50, outfitsLimit: 2, sceneCount: 1, videoCount: 0 },
  { familySlug: "formatura", name: "Formatura 2", basePrice: "650.00", includedPhotos: 25, durationMinutes: 50, outfitsLimit: 2, sceneCount: 1, participantLimit: 2, videoCount: 1 },
  { familySlug: "formatura", name: "Formatura 3", basePrice: "800.00", includedPhotos: 35, durationMinutes: 60, outfitsLimit: 3, sceneCount: 2, participantLimit: 3, videoCount: 2 },
  { familySlug: "marca-pessoal", name: "Essencial", basePrice: "490.00", includedPhotos: 15, durationMinutes: 40, outfitsLimit: 2, sceneCount: 2, videoCount: 0 },
  { familySlug: "marca-pessoal", name: "Majestic", basePrice: "590.00", includedPhotos: 25, durationMinutes: 50, outfitsLimit: 3, sceneCount: 2, videoCount: 1 },
  { familySlug: "marca-pessoal", name: "Divine", basePrice: "750.00", includedPhotos: 40, durationMinutes: 120, outfitsLimit: 5, sceneCount: 2, participantLimit: 3, videoCount: 4 },
  { familySlug: "corporativo", name: "Corporativo 1", basePrice: "550.00", includedPhotos: 15, durationMinutes: 50, outfitsLimit: 1, sceneCount: 1, videoCount: 0 },
  { familySlug: "corporativo", name: "Corporativo 2", basePrice: "580.00", includedPhotos: 25, durationMinutes: 50, outfitsLimit: 3, sceneCount: 2, videoCount: 0 },
  { familySlug: "corporativo", name: "Corporativo 3", basePrice: "899.00", includedPhotos: 35, durationMinutes: 50, outfitsLimit: 4, sceneCount: 2, videoCount: 2 },
];

export async function seedCatalog() {
  await db.insert(experienceFamilies).values(FAMILIES).onConflictDoNothing();
  const families = await db
    .select({ id: experienceFamilies.id, slug: experienceFamilies.slug })
    .from(experienceFamilies)
    .where(inArray(experienceFamilies.slug, FAMILIES.map((family) => family.slug)));
  const familyIds = new Map(families.map((family) => [family.slug, family.id]));

  for (const [sortOrder, item] of INITIAL_PACKAGES.entries()) {
    const familyId = familyIds.get(item.familySlug);
    if (!familyId) throw new Error(`família ausente: ${item.familySlug}`);
    const publicPackage = PUBLIC_FAMILY_SLUGS.has(item.familySlug);
    const values = {
      familyId,
      name: item.name,
      basePrice: item.basePrice,
      includedPhotos: item.includedPhotos,
      durationMinutes: item.durationMinutes,
      outfitsLimit: item.outfitsLimit,
      sceneCount: item.sceneCount,
      participantLimit: item.participantLimit,
      videoCount: item.videoCount,
      makeIncluded: true,
      hairIncluded: true,
      paletteEligible: item.familySlug !== "newborn",
      sortOrder: sortOrder + 1,
      active: true,
      published: publicPackage,
      quizEligible: publicPackage,
    };
    await db.insert(experiencePackages).values(values).onConflictDoNothing();
    await db
      .update(experiencePackages)
      .set(values)
      .where(
        and(
          eq(experiencePackages.name, item.name),
          eq(experiencePackages.basePrice, "0.00"),
          isNull(experiencePackages.familyId),
        ),
      );
  }

  const anniversaryId = familyIds.get("aniversario");
  if (anniversaryId) {
    await db
      .update(experiencePackages)
      .set({ familyId: anniversaryId, active: false, published: false, quizEligible: false })
      .where(and(eq(experiencePackages.name, "Bella"), isNull(experiencePackages.familyId)));
  }
}

seedCatalog()
  .then(() => queryClient.end())
  .catch(async (error) => {
    await queryClient.end();
    console.error(error);
    process.exitCode = 1;
  });
