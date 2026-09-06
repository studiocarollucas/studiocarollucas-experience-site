import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full border border-line bg-white px-3.5 py-2.5 font-sans text-sm text-ink",
        "outline-none focus:border-ink disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
