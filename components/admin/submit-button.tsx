"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-ink bg-ink px-7 py-4 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink disabled:opacity-50"
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}
