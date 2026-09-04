import { z } from "zod";

export const preparationTaskStatusValues = ["pendente", "em_andamento", "concluida"] as const;

export const createPreparationTaskSchema = z.object({
  shootId: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(preparationTaskStatusValues).default("pendente"),
  dueAt: z.string().optional(),
  visibleToClient: z.boolean().default(true),
});

// z.input (not z.infer/z.output): see docs/DECISIONS.md, 2026-09-04 — `status` and
// `visibleToClient` both have `.default()`, so z.infer would make them required
// fields in the type even though Zod itself treats them as optional pre-parse.
// z.input matches the pre-parse shape, consistent with domain/clients|leads|shoots|
// payments/schema.ts.
export type CreatePreparationTaskInput = z.input<typeof createPreparationTaskSchema>;
