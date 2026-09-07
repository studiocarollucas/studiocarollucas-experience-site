import { z } from "zod";
import { db } from "@/db/client";
import { experiencePackages, type ExperiencePackage } from "@/db/schema";
import { eq } from "drizzle-orm";

const experiencePackageFields = z.object({
  familyId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "must be a decimal string like \"890.00\""),
  includedPhotos: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  scenes: z.string().optional(),
  sceneCount: z.number().int().positive().optional(),
  makeIncluded: z.boolean().default(false),
  hairIncluded: z.boolean().default(false),
  outfitsLimit: z.number().int().positive().optional(),
  participantLimit: z.number().int().positive().optional(),
  videoCount: z.number().int().min(0).default(0),
  clutchIncluded: z.boolean().default(false),
  paletteEligible: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  published: z.boolean().default(false),
  quizEligible: z.boolean().default(false),
});

function validateQuizEligibility(
  value: { active?: boolean; published?: boolean; quizEligible?: boolean },
  ctx: z.RefinementCtx,
) {
  if (value.quizEligible && (!value.active || !value.published)) {
    ctx.addIssue({
      code: "custom",
      path: ["quizEligible"],
      message: "Pacote do quiz precisa estar ativo e publicado.",
    });
  }
}

export const createExperiencePackageSchema = experiencePackageFields.superRefine(validateQuizEligibility);

export const updateExperiencePackageSchema = experiencePackageFields.partial();

// z.input (not z.infer/z.output): see docs/DECISIONS.md, 2026-09-04 — `makeIncluded`,
// `clutchIncluded`, and `active` all use `.default()`, so z.infer would make them
// required fields in the type even though Zod itself treats them as optional
// pre-parse. z.input matches the pre-parse shape, consistent with every other
// domain schema module in this epic (clients, leads, shoots, payments, preparation,
// production). This module predates that convention and was retrofitted afterwards.
export type CreateExperiencePackageInput = z.input<typeof createExperiencePackageSchema>;
export type UpdateExperiencePackageInput = z.input<typeof updateExperiencePackageSchema>;

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

export async function updateExperiencePackage(
  id: string,
  patch: UpdateExperiencePackageInput,
): Promise<ExperiencePackage> {
  const before = await getExperiencePackageById(id);
  if (!before) throw new Error("pacote inexistente");
  const parsed = createExperiencePackageSchema.parse({ ...before, ...patch });
  const [row] = await db
    .update(experiencePackages)
    .set(parsed)
    .where(eq(experiencePackages.id, id))
    .returning();
  return row;
}
