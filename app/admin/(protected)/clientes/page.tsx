import Link from "next/link";
import { listClients } from "@/domain/clients/queries";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/admin/search-input";
import { Pagination } from "@/components/admin/pagination";
import { formatShootDate } from "@/lib/format";
import type { ClientListRow } from "@/domain/clients/queries";

type SearchParams = Promise<{ search?: string; page?: string }>;

const columns: Column<ClientListRow>[] = [
  {
    key: "name",
    header: "Nome",
    render: (row) => (
      <Link href={`/admin/clientes/${row.id}`} className="text-ink underline-offset-2 hover:underline">
        {row.name}
      </Link>
    ),
  },
  { key: "phone", header: "Telefone", render: (row) => row.phone ?? "—" },
  { key: "instagram", header: "Instagram", render: (row) => row.instagramHandle ?? "—" },
  { key: "createdAt", header: "Cadastro", render: (row) => formatShootDate(row.createdAt) },
];

export default async function ClientListPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const result = await listClients({ search: sp.search, page: sp.page ? Number(sp.page) : 1 });

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="CRM — cada cliente pode ter vários ensaios ao longo do tempo."
        action={
          <Link
            href="/admin/clientes/novo"
            className="border border-ink bg-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink"
          >
            Nova cliente
          </Link>
        }
      />

      <div className="mb-4">
        <SearchInput placeholder="Buscar por nome, telefone, e-mail…" />
      </div>

      <DataTable
        columns={columns}
        rows={result.rows}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            title="Nenhuma cliente encontrada"
            description={sp.search ? "Ajuste a busca ou cadastre uma nova cliente." : "Cadastre a primeira cliente."}
            action={
              <Link href="/admin/clientes/novo" className="border border-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink">
                Nova cliente
              </Link>
            }
          />
        }
      />

      <Pagination
        basePath="/admin/clientes"
        searchParams={{ search: sp.search }}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </div>
  );
}
