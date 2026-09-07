import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { experienceFamilies, experiencePackages } from "@/db/schema";
import { recommendPackage, type QuizAnswers, type QuizRecommendation } from "./recommendation";

const quizAnswersSchema = z.object({
  familySlug: z.string().min(1),
  aesthetic: z.enum(["romantica", "classica", "intensa", "eterea"]),
  feeling: z.enum(["delicada", "poderosa", "atemporal", "magica"]),
  production: z.enum(["clean", "textura", "elaborado", "imersivo"]),
  looks: z.enum(["1", "2", "3", "group"]),
  investment: z.enum(["up-to-500", "up-to-700", "up-to-1000", "above-1000"]),
});

export type PublicQuizFamily = { slug: string; name: string };
export type PublicQuizRecommendation = {
  packageId: string;
  packageName: string;
  familyName: string;
  persona: string;
  personaCopy: string;
  styling: string;
  sceneDirection: string;
  paletteEligible: boolean;
  usedClosestBudgetMatch: boolean;
};

export function toPublicQuizRecommendation(
  recommendation: QuizRecommendation,
  familyName: string,
): PublicQuizRecommendation {
  return {
    packageId: recommendation.package.id,
    packageName: recommendation.package.name,
    familyName,
    persona: recommendation.persona.name,
    personaCopy: recommendation.persona.copy,
    styling: recommendation.persona.styling,
    sceneDirection: recommendation.persona.sceneDirection,
    paletteEligible: recommendation.package.paletteEligible,
    usedClosestBudgetMatch: recommendation.usedClosestBudgetMatch,
  };
}

const visibleQuizWhere = and(
  eq(experienceFamilies.active, true),
  eq(experienceFamilies.published, true),
  eq(experiencePackages.active, true),
  eq(experiencePackages.published, true),
  eq(experiencePackages.quizEligible, true),
);

export async function getPublicQuizCatalog(): Promise<{ families: PublicQuizFamily[] }> {
  const rows = await db
    .select({
      familySlug: experienceFamilies.slug,
      familyName: experienceFamilies.name,
    })
    .from(experiencePackages)
    .innerJoin(experienceFamilies, eq(experiencePackages.familyId, experienceFamilies.id))
    .where(visibleQuizWhere)
    .orderBy(asc(experienceFamilies.sortOrder), asc(experienceFamilies.name));
  const seen = new Set<string>();
  const families: PublicQuizFamily[] = [];
  for (const row of rows) {
    if (!seen.has(row.familySlug)) {
      seen.add(row.familySlug);
      families.push({ slug: row.familySlug, name: row.familyName });
    }
  }
  return { families };
}

export async function recommendQuizPackage(raw: unknown): Promise<PublicQuizRecommendation> {
  const answers = quizAnswersSchema.parse(raw) as QuizAnswers;
  const rows = await db
    .select({ package: experiencePackages, family: experienceFamilies })
    .from(experiencePackages)
    .innerJoin(experienceFamilies, eq(experiencePackages.familyId, experienceFamilies.id))
    .where(and(visibleQuizWhere, eq(experienceFamilies.slug, answers.familySlug)));
  const recommendation = recommendPackage(
    answers,
    rows.map(({ package: packageItem, family }) => ({
      id: packageItem.id,
      familySlug: family.slug,
      name: packageItem.name,
      basePrice: packageItem.basePrice,
      outfitsLimit: packageItem.outfitsLimit,
      sceneCount: packageItem.sceneCount,
      participantLimit: packageItem.participantLimit,
      paletteEligible: packageItem.paletteEligible,
    })),
  );
  return toPublicQuizRecommendation(recommendation, rows[0]?.family.name ?? answers.familySlug);
}
