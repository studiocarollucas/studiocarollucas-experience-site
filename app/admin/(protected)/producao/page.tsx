import { getProductionBoard } from "@/domain/production/queries";
import { PageHeader } from "@/components/ui/page-header";
import { KanbanColumn } from "@/components/admin/kanban-column";
import { ProductionCardView } from "@/components/admin/production-card";

// Reads live production data on every request; there is nothing to prerender.
// Matches the other Studio OS list pages, which are dynamic via `searchParams`.
export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  aguardando: "Aguardando",
  iniciado: "Iniciado",
  parcial: "Parcial",
  finalizado: "Finalizado",
  entregue: "Entregue",
};

export default async function ProducaoPage() {
  const board = await getProductionBoard();

  return (
    <div>
      <PageHeader
        title="Produção & Edição"
        description="Um job por ensaio. Arraste o status pelo controle de cada card."
      />
      <div className="flex gap-6 overflow-x-auto pb-4">
        {board.map((col) => (
          <KanbanColumn key={col.column} title={LABELS[col.column] ?? col.column} count={col.cards.length}>
            {col.cards.length === 0 ? (
              <p className="font-sans text-xs text-muted">—</p>
            ) : (
              col.cards.map((card) => <ProductionCardView key={card.jobId} card={card} />)
            )}
          </KanbanColumn>
        ))}
      </div>
    </div>
  );
}
