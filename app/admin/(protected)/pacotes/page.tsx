import Link from "next/link";
import { listCatalogPackages, type CatalogPackageRow } from "@/domain/catalog/queries";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBRL } from "@/lib/format";

function status(row: CatalogPackageRow) {
  if (!row.active) return <Badge tone="danger">Inativo</Badge>;
  if (row.quizEligible) return <Badge tone="success">Quiz</Badge>;
  if (row.published) return <Badge tone="active">Publicado</Badge>;
  return <Badge>Rascunho</Badge>;
}

const columns: Column<CatalogPackageRow>[] = [
  {
    key: "package",
    header: "Pacote",
    render: (row) => (
      <Link href={`/admin/pacotes/${row.id}`} className="text-ink underline-offset-2 hover:underline">
        {row.name}
      </Link>
    ),
  },
  { key: "family", header: "Família", render: (row) => row.familyName ?? "Sem família" },
  { key: "price", header: "Preço interno", render: (row) => formatBRL(row.basePrice) },
  { key: "looks", header: "Looks", render: (row) => row.outfitsLimit ?? "—" },
  { key: "status", header: "Disponibilidade", render: status },
];

export default async function PackagesPage() {
  const packages = await listCatalogPackages();
  return (
    <div>
      <PageHeader
        title="Pacotes"
        description="Catálogo interno que alimentará o quiz e a criação de ensaios."
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/pacotes/familias" className="border border-line px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:border-ink">
              Famílias
            </Link>
            <Link href="/admin/pacotes/novo" className="border border-ink bg-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink">
              Novo pacote
            </Link>
          </div>
        }
      />
      <DataTable
        columns={columns}
        rows={packages}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            title="Nenhum pacote cadastrado"
            description="Comece incluindo a primeira opção do catálogo."
            action={<Link href="/admin/pacotes/novo" className="border border-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink">Novo pacote</Link>}
          />
        }
      />
    </div>
  );
}
