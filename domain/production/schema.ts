import { z } from "zod";

export const productionJobStatusValues = ["aguardando", "iniciado", "parcial", "finalizado", "entregue"] as const;

export const createProductionJobSchema = z.object({
  shootId: z.string().uuid(),
  status: z.enum(productionJobStatusValues).default("aguardando"),
  editorUserId: z.string().uuid().optional(),
  photosToEdit: z.number().int().positive().optional(),
  deliveryDueAt: z.string().optional(),
  selectionStatus: z.string().optional(),
  notes: z.string().optional(),
});

// z.input (not z.infer/z.output): see docs/DECISIONS.md, 2026-09-04 — `status` has
// `.default()`, so z.infer would make it a required field in the type even though
// Zod itself treats it as optional pre-parse. z.input matches the pre-parse shape,
// consistent with domain/clients|leads|shoots|payments|preparation/schema.ts.
export type CreateProductionJobInput = z.input<typeof createProductionJobSchema>;
