import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 font-serif text-lg font-light text-ink">{title}</h2>
      {children}
    </Card>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between border-b border-line py-2 font-sans text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
