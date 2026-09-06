import { z } from "zod";
import { getCurrentUser, type CurrentUser, type Role } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/rbac";
import { logger } from "@/lib/observability/logger";
import type { ActionResult } from "@/lib/auth/action-result";

// Re-exported so existing server-side imports (`@/lib/auth/admin-action`) keep working.
// Client components should import these from `@/lib/auth/action-result` directly to
// avoid pulling the session/db graph into the browser bundle.
export { toFormAction } from "@/lib/auth/action-result";
export type { ActionResult } from "@/lib/auth/action-result";

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
