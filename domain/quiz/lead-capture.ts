import "server-only";

import { z } from "zod";
import { createLead } from "@/domain/leads/service";
import type { PublicQuizRecommendation } from "./catalog";
import type { QuizAnswers } from "./recommendation";

const quizAnswersSchema = z.object({
  familySlug: z.string().min(1),
  aesthetic: z.enum(["romantica", "classica", "intensa", "eterea"]),
  feeling: z.enum(["delicada", "poderosa", "atemporal", "magica"]),
  production: z.enum(["clean", "textura", "elaborado", "imersivo"]),
  looks: z.enum(["1", "2", "3", "group"]),
  investment: z.enum(["up-to-500", "up-to-700", "up-to-1000", "above-1000"]),
});

export const quizLeadCaptureSchema = z.object({
  consent: z.literal(true),
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().max(40).optional(),
  result: z
    .object({
      packageId: z.string().uuid(),
      packageName: z.string(),
      familyName: z.string(),
      persona: z.string(),
      paletteEligible: z.boolean(),
      usedClosestBudgetMatch: z.boolean(),
    })
    .passthrough(),
  answers: quizAnswersSchema,
});

export type QuizLeadCaptureInput =
  | { consent: false }
  | {
      consent: true;
      name: string;
      email: string;
      phone?: string;
      result: PublicQuizRecommendation;
      answers: QuizAnswers;
    };

export async function captureQuizLead(input: QuizLeadCaptureInput): Promise<{ created: boolean }> {
  if (!input.consent) return { created: false };

  const parsed = quizLeadCaptureSchema.parse(input);
  const quizResult = JSON.stringify({
    persona: parsed.result.persona,
    package: parsed.result.packageName,
    family: parsed.result.familyName,
    answers: parsed.answers,
  });

  await createLead({
    source: "quiz",
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    quizResult,
  });

  return { created: true };
}
