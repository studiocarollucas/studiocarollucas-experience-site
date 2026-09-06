import { z } from "zod";
import { createShootSchema } from "./schema";

// createShootSchema expects participantCount as a number and portalEnabled as a
// boolean. toFormAction() already coerces declared numbers/booleans, but keep the
// schema itself tolerant of a string number in case the action is called directly.
export const newShootFormSchema = createShootSchema.extend({
  participantCount: z.coerce.number().int().positive().optional(),
  portalEnabled: z.coerce.boolean().default(false),
});

export type NewShootFormValues = z.input<typeof newShootFormSchema>;
