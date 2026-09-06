import type { ActionResult } from "@/lib/auth/action-result";

export function FormStatus({ state }: { state: ActionResult<unknown> | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="border border-danger px-4 py-3 font-sans text-sm text-danger">
      {state.error}
    </p>
  );
}
