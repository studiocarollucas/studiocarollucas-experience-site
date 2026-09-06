import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="font-sans text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="font-sans text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
