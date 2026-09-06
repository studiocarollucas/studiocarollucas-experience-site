import { z } from "zod";
import { getCurrentUser, type CurrentUser, type Role } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/rbac";
import { logger } from "@/lib/observability/logger";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type Ctx = { user: CurrentUser };

// Overload order matters: the schema form is declared first so an inline handler
// arg is contextually typed from `z.output<TSchema>`, not from the no-input form's
// `undefined` (which would make `defineAdminAction({ role, input }, (i) => ...)`
// fail to resolve).
export function defineAdminAction<TSchema extends z.ZodType, TOut>(
  config: { role: Role; input: TSchema },
  handler: (input: z.output<TSchema>, ctx: Ctx) => Promise<TOut>,
): (raw: unknown) => Promise<ActionResult<TOut>>;
export function defineAdminAction<TOut>(
  config: { role: Role },
  handler: (input: undefined, ctx: Ctx) => Promise<TOut>,
): (raw: unknown) => Promise<ActionResult<TOut>>;
export function defineAdminAction<TSchema extends z.ZodType, TOut>(
  config: { role: Role; input?: TSchema },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- implementation signature: must accept both overloads' handler shapes
  handler: (input: any, ctx: Ctx) => Promise<TOut>,
) {
  return async (raw: unknown): Promise<ActionResult<TOut>> => {
    const user = await getCurrentUser();
    try {
      requireRole(user, config.role);
    } catch {
      return { ok: false, error: "Você não tem permissão para executar esta ação." };
    }

    let input: unknown;
    if (config.input) {
      const parsed = config.input.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          error: "Verifique os campos destacados.",
          fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        };
      }
      input = parsed.data;
    }

    try {
      const data = await handler(input, { user: user as CurrentUser });
      return { ok: true, data };
    } catch (err) {
      logger.error("admin action failed", {
        role: config.role,
        message: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, error: "Não foi possível concluir a operação. Tente novamente." };
    }
  };
}

/**
 * Adapts a defineAdminAction result-function to React 19's useActionState signature.
 * Empty form fields are dropped (so Zod `.optional()` sees `undefined`, not `""`);
 * `numbers` are Number()-coerced; `booleans` become presence checks (checkbox on/off).
 */
export function toFormAction<T>(
  action: (raw: unknown) => Promise<ActionResult<T>>,
  opts: { numbers?: string[]; booleans?: string[] } = {},
) {
  return async (_prev: ActionResult<T> | null, formData: FormData): Promise<ActionResult<T>> => {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string") continue;
      if (value === "") continue;
      obj[key] = value;
    }
    for (const key of opts.numbers ?? []) {
      if (key in obj) obj[key] = Number(obj[key]);
    }
    for (const key of opts.booleans ?? []) {
      obj[key] = key in obj;
    }
    return action(obj);
  };
}
