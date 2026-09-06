import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full border border-line bg-white px-3.5 py-2.5 font-sans text-sm text-ink",
        "outline-none focus:border-ink disabled:opacity-50",
        className,
      )}
      rows={4}
      {...props}
    />
  );
}
