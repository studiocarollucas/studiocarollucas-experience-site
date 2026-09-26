import { z } from "zod";
import { reviewSourceValues, reviewTargetValues } from "@/db/schema/growth";

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .url("Informe um link válido.")
  .refine((value) => value.startsWith("https://"), "Use um link https.");

export const requestReviewSchema = z.object({
  clientId: z.string().uuid(),
  shootId: z.string().uuid().optional(),
  source: z.enum(reviewSourceValues),
  // PRD §7.10: Google Business Profile is the priority destination.
  target: z.enum(reviewTargetValues).default("google"),
  targetUrl: httpsUrl.optional(),
});

export const completeReviewSchema = z.object({
  reviewId: z.string().uuid(),
  completedAt: z.iso.datetime({ offset: true }).optional(),
  targetUrl: httpsUrl.optional(),
});

export const cancelReviewSchema = z.object({
  reviewId: z.string().uuid(),
});

// z.input: `target` has a default, so it is optional for callers (see
// domain/leads/schema.ts and docs/DECISIONS.md, 2026-09-04).
export type RequestReviewInput = z.input<typeof requestReviewSchema>;
export type CompleteReviewInput = z.input<typeof completeReviewSchema>;
export type CancelReviewInput = z.input<typeof cancelReviewSchema>;
