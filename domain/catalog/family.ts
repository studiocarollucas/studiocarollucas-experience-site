import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { experienceFamilies, type ExperienceFamily } from "@/db/schema";

const familySlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const createExperienceFamilySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: familySlug,
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  published: z.boolean().default(false),
});

export const updateExperienceFamilySchema = createExperienceFamilySchema.partial();

export type CreateExperienceFamilyInput = z.input<typeof createExperienceFamilySchema>;
export type UpdateExperienceFamilyInput = z.input<typeof updateExperienceFamilySchema>;

export async function createExperienceFamily(
  input: CreateExperienceFamilyInput,
): Promise<ExperienceFamily> {
  const parsed = createExperienceFamilySchema.parse(input);
  const [row] = await db.insert(experienceFamilies).values(parsed).returning();
  return row;
}

export async function getExperienceFamilyById(id: string): Promise<ExperienceFamily | null> {
  const [row] = await db
    .select()
    .from(experienceFamilies)
    .where(eq(experienceFamilies.id, id))
    .limit(1);
  return row ?? null;
}

export async function updateExperienceFamily(
  id: string,
  patch: UpdateExperienceFamilyInput,
): Promise<ExperienceFamily> {
  const parsed = updateExperienceFamilySchema.parse(patch);
  const [row] = await db
    .update(experienceFamilies)
    .set(parsed)
    .where(eq(experienceFamilies.id, id))
    .returning();
  if (!row) throw new Error("família inexistente");
  return row;
}
