// Client-safe half of the admin-action toolkit. `defineAdminAction` (admin-action.ts)
// pulls in the session/db/supabase server graph, so a "use client" form must not
// import from there just to get the result type or the FormData adapter. Those two
// live here instead; admin-action.ts re-exports them for server-side callers.

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

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
