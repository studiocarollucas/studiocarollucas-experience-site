import { z } from "zod";
import { createClientSchema } from "./schema";

// createClientSchema already covers every field. The only form-specific concern is
// the marketing-consent checkbox: toFormAction() (lib/auth/admin-action.ts) turns a
// declared boolean field into a real `true`/`false` before the action runs, so here
// we only need to accept an already-boolean value and keep the same `.default(false)`.
export const clientFormSchema = createClientSchema;

export type ClientFormValues = z.input<typeof clientFormSchema>;
