import { Card } from "@/components/ui/card";

export function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-2xl font-light text-ink">{value}</p>
      {sub ? <p className="mt-1 font-sans text-xs text-muted">{sub}</p> : null}
    </Card>
  );
}
