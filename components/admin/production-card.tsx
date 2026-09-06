import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatShootDate } from "@/lib/format";
import type { ProductionCard as CardData } from "@/domain/production/queries";
import { ProductionStatusControl } from "@/app/admin/(protected)/producao/production-status-control";

export function ProductionCardView({ card }: { card: CardData }) {
  return (
    <Card className="p-4">
      <Link
        href={`/admin/agenda/${card.shootId}`}
        className="font-serif text-base text-ink underline-offset-2 hover:underline"
      >
        {card.clientName}
      </Link>
      <p className="mt-1 font-sans text-xs text-muted">
        {card.packageName} · {formatShootDate(card.shootDate)}
      </p>
      <dl className="mt-3 flex flex-col gap-1 font-sans text-xs text-muted">
        <div className="flex justify-between">
          <dt>Editor</dt>
          <dd className="text-ink">{card.editorName ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Fotos</dt>
          <dd className="text-ink">{card.photosToEdit ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Prazo</dt>
          <dd className="text-ink">{card.deliveryDueAt ? formatShootDate(card.deliveryDueAt) : "—"}</dd>
        </div>
      </dl>
      <div className="mt-3 border-t border-line pt-3">
        <ProductionStatusControl jobId={card.jobId} status={card.status} />
      </div>
    </Card>
  );
}
