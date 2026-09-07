"use server";

import { recommendQuizPackage, type PublicQuizRecommendation } from "@/domain/quiz/catalog";
import type { QuizAnswers } from "@/domain/quiz/recommendation";

export async function recommendQuizPackageAction(answers: QuizAnswers): Promise<PublicQuizRecommendation> {
  return recommendQuizPackage(answers);
}
