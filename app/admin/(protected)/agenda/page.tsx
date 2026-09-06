import Link from "next/link";
import { listShoots } from "@/domain/shoots/queries";
import { shootStatusValues } from "@/domain/shoots/schema";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/admin/search-input";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination } from "@/components/admin/pagination";
import { formatShootDate, formatBRL } from "@/lib/format";
import type { ShootListRow } from "@/domain/shoots/queries";

type SearchParams = Promise<{
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

const columns: Column<ShootListRow>[] = [
  {
    key: "client",
    header: "Cliente",
    render: (r) => (
      <Link href={`/admin/agenda/${r.id}`} className="text-ink underline-offset-2 hover:underline">
        {r.clientName}
      </Link>
    ),
  },
  { key: "package", header: "Experiência", render: (r) => r.packageName },
  {
    key: "date",
    header: "Data",
    render: (r) => `${formatShootDate(r.shootDate)}${r.startTime ? ` · ${r.startTime.slice(0, 5)}` : ""}`,
  },
  { key: "status", header: "Status", render: (r) => <Badge tone="active">{r.status}</Badge> },
  {
    key: "payment",
    header: "Financeiro",
    render: (r) => (
      <Badge tone={r.paymentStatus === "pago" ? "success" : r.paymentStatus === "parcial" ? "warning" : "neutral"}>
        {r.paymentStatus}
      </Badge>
    ),
  },
  { key: "price", header: "Valor", render: (r) => formatBRL(r.agreedPrice) },
];

const statusOptions = shootStatusValues.map((s) => ({ value: s, label: s }));

export default async function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const result = await listShoots(sp);

  return (
    <div>
      <PageHeader
        title="Agenda & Ensaios"
        description="Visão em lista. Filtre por status, data ou busque por cliente."
        action={
          <Link
            href="/admin/agenda/novo"
            className="border border-ink bg-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink"
          >
            Novo ensaio
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SearchInput placeholder="Buscar por cliente ou experiência…" />
        <FilterBar statusOptions={statusOptions} />
      </div>

      <DataTable
        columns={columns}
        rows={result.rows}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            title="Nenhum ensaio"
            description="Nenhum ensaio corresponde aos filtros atuais."
            action={
              <Link href="/admin/agenda/novo" className="border border-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink">
                Novo ensaio
              </Link>
            }
          />
        }
      />

      <Pagination
        basePath="/admin/agenda"
        searchParams={{ search: sp.search, status: sp.status, from: sp.from, to: sp.to }}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </div>
  );
}
