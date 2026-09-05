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

// z.input (not z.infer/z.output): see docs/DECISIONS.md, 2026-09-04 — `makeIncluded`,
// `clutchIncluded`, and `active` all use `.default()`, so z.infer would make them
// required fields in the type even though Zod itself treats them as optional
// pre-parse. z.input matches the pre-parse shape, consistent with every other
// domain schema module in this epic (clients, leads, shoots, payments, preparation,
// production). This module predates that convention and was retrofitted afterwards.
export type CreateExperiencePackageInput = z.input<typeof createExperiencePackageSchema>;

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
