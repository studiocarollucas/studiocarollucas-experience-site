import Link from "next/link";
import { listFamilies } from "@/domain/catalog/queries";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type FamilyRow = Awaited<ReturnType<typeof listFamilies>>[number];

const columns: Column<FamilyRow>[] = [
  {
    key: "name",
    header: "Família",
    render: (row) => <Link href={`/admin/pacotes/familias/${row.id}`} className="text-ink underline-offset-2 hover:underline">{row.name}</Link>,
  },
  { key: "slug", header: "Slug", render: (row) => row.slug },
  { key: "order", header: "Ordem", render: (row) => row.sortOrder },
  { key: "active", header: "Studio OS", render: (row) => <Badge tone={row.active ? "active" : "danger"}>{row.active ? "Ativa" : "Inativa"}</Badge> },
  { key: "published", header: "Site", render: (row) => <Badge tone={row.published ? "success" : "neutral"}>{row.published ? "Publicada" : "Oculta"}</Badge> },
];

export default async function FamiliesPage() {
  const families = await listFamilies();
  return (
    <div>
      <PageHeader
        title="Famílias de experiência"
        description="Organize os tipos de ensaio antes de criar ou publicar seus pacotes."
        action={<Link href="/admin/pacotes/familias/novo" className="border border-ink bg-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white hover:bg-transparent hover:text-ink">Nova família</Link>}
      />
      <DataTable
        columns={columns}
        rows={families}
        rowKey={(row) => row.id}
        empty={<EmptyState title="Nenhuma família cadastrada" description="Crie a família que agrupará os pacotes." />}
      />
    </div>
  );
}
