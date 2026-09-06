import { listExpenses } from "@/domain/finance/expense-queries";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { ExpenseForm } from "./expense-form";
import { formatBRL, formatShootDate } from "@/lib/format";
import type { ExpenseListRow } from "@/domain/finance/expense-queries";

type SearchParams = Promise<{ from?: string; to?: string }>;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10),
  };
}

const columns: Column<ExpenseListRow>[] = [
  { key: "date", header: "Data", render: (e) => formatShootDate(e.date) },
  { key: "type", header: "Tipo", render: (e) => e.type },
  { key: "category", header: "Categoria", render: (e) => e.category ?? "—" },
  { key: "method", header: "Forma", render: (e) => e.method ?? "—" },
  { key: "recurring", header: "Recorrente", render: (e) => (e.recurring ? "Sim" : "Não") },
  { key: "amount", header: "Valor", className: "text-right", render: (e) => formatBRL(e.amount) },
];

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const fallback = defaultRange();
  const range = {
    from: sp.from && ISO.test(sp.from) ? sp.from : fallback.from,
    to: sp.to && ISO.test(sp.to) ? sp.to : fallback.to,
  };
  const rows = await listExpenses(range);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Despesas" description="Saídas independentes de um ensaio (PRD §7.5)." />
      <Card>
        <h2 className="mb-4 font-serif text-lg font-light text-ink">Nova despesa</h2>
        <ExpenseForm />
      </Card>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        empty={<EmptyState title="Sem despesas" description="Nenhuma despesa no período." />}
      />
    </div>
  );
}
