import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = {
  neutral: "border-line text-muted",
  active: "border-ink text-ink",
  success: "border-[#1e7d4f] text-[#1e7d4f]",
  warning: "border-taupe2 text-taupe2",
  danger: "border-danger text-danger",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.12em]",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
