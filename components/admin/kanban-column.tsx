import type { ReactNode } from "react";

export function KanbanColumn({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <h2 className="font-sans text-[11px] uppercase tracking-[0.16em] text-muted">{title}</h2>
        <span className="font-sans text-xs text-muted">{count}</span>
      </div>
      {children}
    </div>
  );
}
