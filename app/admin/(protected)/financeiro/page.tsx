import Link from "next/link";
import { getFinancialLedger } from "@/domain/finance/queries";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/admin/kpi-tile";
import { PeriodPicker } from "@/components/admin/period-picker";
import { formatBRL, formatShootDate } from "@/lib/format";
import type { LedgerEntry } from "@/domain/finance/ledger";

type SearchParams = Promise<{ from?: string; to?: string }>;

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const columns: Column<LedgerEntry>[] = [
  { key: "date", header: "Data", render: (e) => formatShootDate(e.date) },
  { key: "kind", header: "Tipo", render: (e) => (e.kind === "recebimento" ? "Recebimento" : "Despesa") },
  { key: "description", header: "Descrição", render: (e) => e.description },
  {
    key: "amount",
    header: "Valor",
    className: "text-right",
    render: (e) => (
      <span className={e.signedAmount.startsWith("-") ? "text-danger" : "text-[#1e7d4f]"}>
        {formatBRL(e.signedAmount)}
      </span>
    ),
  },
];

export default async function FinanceiroPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const fallback = defaultRange();
  const range = {
    from: sp.from && ISO.test(sp.from) ? sp.from : fallback.from,
    to: sp.to && ISO.test(sp.to) ? sp.to : fallback.to,
  };
  const { entries, summary } = await getFinancialLedger(range);

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Livro de recebimentos e despesas. Todos os valores derivam dos registros normalizados."
        action={
          <Link
            href="/admin/financeiro/despesas"
            className="border border-line px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:border-ink"
          >
            Despesas
          </Link>
        }
      />

      <div className="mb-6"><PeriodPicker /></div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Recebido" value={formatBRL(summary.received)} />
        <KpiTile label="Despesas" value={formatBRL(summary.expenses)} />
        <KpiTile label="Resultado" value={formatBRL(summary.net)} />
        <KpiTile label="A receber (total)" value={formatBRL(summary.receivable)} />
      </div>

      <DataTable
        columns={columns}
        rows={entries}
        rowKey={(e) => e.id}
        empty={<EmptyState title="Sem lançamentos" description="Nenhum recebimento ou despesa no período." />}
      />
    </div>
  );
}
