"use server";

import { recommendQuizPackage, type PublicQuizRecommendation } from "@/domain/quiz/catalog";
import { captureQuizLead, type QuizLeadCaptureInput } from "@/domain/quiz/lead-capture";
import type { QuizAnswers } from "@/domain/quiz/recommendation";

export async function recommendQuizPackageAction(answers: QuizAnswers): Promise<PublicQuizRecommendation> {
  return recommendQuizPackage(answers);
}

export async function captureQuizLeadAction(input: QuizLeadCaptureInput): Promise<{ created: boolean }> {
  const { created } = await captureQuizLead(input);
  return { created };
}
