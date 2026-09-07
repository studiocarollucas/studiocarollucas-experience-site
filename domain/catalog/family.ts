import { z } from "zod";

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
