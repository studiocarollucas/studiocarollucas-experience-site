import { z } from "zod";

export const createShootInventoryReservationSchema = z
  .object({
    inventoryItemId: z.string().uuid(),
    shootId: z.string().uuid(),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    overrideConflict: z.boolean().default(false),
    overrideReason: z.string().trim().min(1).optional(),
  })
  .refine((value) => value.endsOn >= value.startsOn, {
    path: ["endsOn"],
    message: "fim anterior ao início",
  })
  .refine((value) => !value.overrideConflict || Boolean(value.overrideReason), {
    path: ["overrideReason"],
    message: "justificativa obrigatória",
  });

export type CreateShootInventoryReservationInput = z.input<typeof createShootInventoryReservationSchema>;
