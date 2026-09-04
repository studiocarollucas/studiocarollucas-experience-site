import { z } from "zod";
import { db } from "@/db/client";
import { experiencePackages, type ExperiencePackage } from "@/db/schema";
import { eq } from "drizzle-orm";

export const createExperiencePackageSchema = z.object({
  name: z.string().min(1),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "must be a decimal string like \"890.00\""),
  includedPhotos: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  scenes: z.string().optional(),
  makeIncluded: z.boolean().default(false),
  outfitsLimit: z.number().int().positive().optional(),
  clutchIncluded: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type CreateExperiencePackageInput = z.infer<typeof createExperiencePackageSchema>;

export async function createExperiencePackage(
  input: CreateExperiencePackageInput
): Promise<ExperiencePackage> {
  const parsed = createExperiencePackageSchema.parse(input);
  const [row] = await db.insert(experiencePackages).values(parsed).returning();
  return row;
}

export async function getExperiencePackageById(id: string): Promise<ExperiencePackage | null> {
  const [row] = await db
    .select()
    .from(experiencePackages)
    .where(eq(experiencePackages.id, id))
    .limit(1);
  return row ?? null;
}
