import "server-only";

import { z } from "zod";
import { createLead } from "@/domain/leads/service";
import { recommendQuizPackage, type PublicQuizRecommendation } from "./catalog";
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
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, "telefone inválido")
    .optional(),
  result: z.unknown(),
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
  const recommendation = await recommendQuizPackage(parsed.answers);
  const quizResult = JSON.stringify({
    persona: recommendation.persona,
    package: recommendation.packageName,
    family: recommendation.familyName,
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
