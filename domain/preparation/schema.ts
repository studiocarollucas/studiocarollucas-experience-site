import { z } from "zod";

export const preparationTaskStatusValues = ["pendente", "em_andamento", "concluida"] as const;

export const createPreparationTaskSchema = z.object({
  shootId: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(preparationTaskStatusValues).default("pendente"),
  // `preparation_tasks.due_at` is `timestamp with time zone` (verified live against
  // information_schema.columns), so this takes a full ISO datetime with an explicit
  // offset — the same shape as payments.paidAt, not a bare calendar date.
  dueAt: z.iso.datetime({ offset: true }).optional(), // e.g. "2026-12-01T14:30:00-03:00"
  visibleToClient: z.boolean().default(true),
  clientActionable: z.boolean().default(false),
}).refine((task) => !task.clientActionable || task.visibleToClient, {
  error: "uma tarefa editável pela cliente precisa estar visível",
  path: ["clientActionable"],
});

// z.input (not z.infer/z.output): see docs/DECISIONS.md, 2026-09-04 — `status` and
// `visibleToClient` both have `.default()`, so z.infer would make them required
// fields in the type even though Zod itself treats them as optional pre-parse.
// z.input matches the pre-parse shape, consistent with domain/clients|leads|shoots|
// payments/schema.ts.
export type CreatePreparationTaskInput = z.input<typeof createPreparationTaskSchema>;

export const addPreparationTaskFormSchema = createPreparationTaskSchema.safeExtend({
  // safeExtend checks input compatibility too; the annotation preserves the
  // base boolean input while retaining the form's runtime coercion.
  visibleToClient: z.coerce.boolean<boolean>().default(true),
  clientActionable: z.coerce.boolean<boolean>().default(false),
});
