import Link from "next/link";
import type { UpsellProduct } from "@/db/schema";
import { listUpsellProducts } from "@/domain/upsell/catalog";
import { upsellProductKindLabels } from "@/domain/upsell/labels";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBRL } from "@/lib/format";

const columns: Column<UpsellProduct>[] = [
  {
    key: "name",
    header: "Produto",
    render: (row) => (
      <Link href={`/admin/upsells/${row.id}`} className="text-ink underline-offset-2 hover:underline">
        {row.name}
      </Link>
    ),
  },
  { key: "kind", header: "Tipo", render: (row) => upsellProductKindLabels[row.kind] },
  { key: "price", header: "Preço interno", render: (row) => formatBRL(row.price) },
  {
    key: "status",
    header: "Disponibilidade",
    render: (row) => (row.active ? <Badge tone="success">Ativo</Badge> : <Badge tone="danger">Inativo</Badge>),
  },
];

const buttonClass =
  "border px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em]";

export default async function UpsellProductsPage() {
  const products = await listUpsellProducts();
  return (
    <div>
      <PageHeader
        title="Upsells"
        description="Produtos pós-ensaio que podem ser ofertados na galeria de cada cliente."
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/upsells/pedidos" className={`${buttonClass} border-line text-ink hover:border-ink`}>
              Pedidos
            </Link>
            <Link
              href="/admin/upsells/novo"
              className={`${buttonClass} border-ink bg-ink text-white hover:bg-transparent hover:text-ink`}
            >
              Novo produto
            </Link>
          </div>
        }
      />
      <DataTable
        columns={columns}
        rows={products}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            title="Nenhum produto cadastrado"
            description="Cadastre fotos adicionais, coleção completa, álbum, quadro, Reel/Stories ou outros produtos."
            action={
              <Link href="/admin/upsells/novo" className={`${buttonClass} border-ink text-ink`}>
                Novo produto
              </Link>
            }
          />
        }
      />
    </div>
  );
}
