import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { listLeads, listLeadOwnerOptions, type LeadListRow } from "@/domain/leads/queries";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/admin/search-input";
import { LeadFilterBar } from "@/components/admin/lead-filter-bar";
import { LeadCard } from "@/components/admin/lead-card";
import { Pagination } from "@/components/admin/pagination";
import { formatDateTime } from "@/lib/format";

type SearchParams = Promise<{
  query?: string;
  status?: string;
  source?: string;
  ownerId?: string;
  page?: string;
}>;

const columns: Column<LeadListRow>[] = [
  { key: "lead", header: "Lead", render: (lead) => <LeadCard lead={lead} /> },
  { key: "occasion", header: "Ocasião", render: (lead) => lead.occasion ?? "—" },
  { key: "owner", header: "Responsável", render: (lead) => lead.ownerName ?? "Sem responsável" },
  {
    key: "quiz",
    header: "Quiz",
    render: (lead) => (lead.quizResult ? lead.quizResult : "—"),
    className: "max-w-64",
  },
  { key: "createdAt", header: "Entrada", render: (lead) => formatDateTime(lead.createdAt) },
];

export default async function LeadListPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user || !hasMinimumRole(user.role, "staff")) redirect("/admin/login");

  const sp = await searchParams;
  const [result, owners] = await Promise.all([
    listLeads({ query: sp.query, status: sp.status, source: sp.source, ownerId: sp.ownerId, page: sp.page }),
    listLeadOwnerOptions(),
  ]);

  return (
    <div>
      <PageHeader title="Leads" description="Funil comercial — consulte contatos recebidos e seus dados já registrados." />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SearchInput placeholder="Buscar por nome, telefone ou e-mail…" />
        <LeadFilterBar owners={owners} />
      </div>

      <DataTable
        columns={columns}
        rows={result.rows}
        rowKey={(lead) => lead.id}
        empty={
          <EmptyState
            title="Nenhum lead encontrado"
            description={sp.query || sp.status || sp.source || sp.ownerId ? "Ajuste a busca ou os filtros." : "Ainda não há leads cadastrados."}
          />
        }
      />

      <Pagination
        basePath="/admin/leads"
        searchParams={{ query: sp.query, status: sp.status, source: sp.source, ownerId: sp.ownerId }}
        page={result.page}
        pageSize={result.limit}
        total={result.total}
      />
    </div>
  );
}
