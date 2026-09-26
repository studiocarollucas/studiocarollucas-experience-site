import Link from "next/link";
import {
  listUpsellOrders,
  normalizeUpsellOrderStatusFilter,
  type UpsellOrderListRow,
} from "@/domain/upsell/orders";
import { upsellOrderStatusLabels, upsellOrderStatuses, upsellPaymentStatusLabels } from "@/domain/upsell/labels";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatBRL, formatShootDate } from "@/lib/format";

type SearchParams = Promise<{ status?: string }>;

function statusTone(status: UpsellOrderListRow["status"]) {
  if (status === "cancelado") return "danger" as const;
  if (status === "entregue") return "success" as const;
  if (status === "solicitado") return "warning" as const;
  return "active" as const;
}

const columns: Column<UpsellOrderListRow>[] = [
  {
    key: "order",
    header: "Pedido",
    render: (row) => (
      <Link href={`/admin/upsells/pedidos/${row.id}`} className="text-ink underline-offset-2 hover:underline">
        {formatShootDate(row.createdAt.toISOString())}
      </Link>
    ),
  },
  { key: "client", header: "Cliente", render: (row) => row.clientName },
  {
    key: "shoot",
    header: "Ensaio",
    render: (row) => (
      <Link href={`/admin/agenda/${row.shootId}`} className="underline-offset-2 hover:underline">
        {formatShootDate(row.shootDate)}
      </Link>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <Badge tone={statusTone(row.status)}>{upsellOrderStatusLabels[row.status]}</Badge>,
  },
  { key: "total", header: "Total", render: (row) => formatBRL(row.total) },
  {
    key: "payment",
    header: "Pagamento",
    render: (row) => `${upsellPaymentStatusLabels[row.money.paymentStatus]} · saldo ${formatBRL(row.money.balance)}`,
  },
];

export default async function UpsellOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { status: rawStatus } = await searchParams;
  const status = normalizeUpsellOrderStatusFilter(rawStatus);
  const orders = await listUpsellOrders({ status });

  const filterClass = (active: boolean) =>
    cn(
      "border px-3 py-2 font-sans text-[10px] uppercase tracking-[0.16em]",
      active ? "border-ink bg-ink text-white" : "border-line text-muted hover:text-ink",
    );

  return (
    <div>
      <PageHeader
        title="Pedidos de upsell"
        description="Pedidos feitos pelas clientes na galeria. O status do pedido é independente do pagamento."
        action={
          <Link
            href="/admin/upsells"
            className="border border-line px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:border-ink"
          >
            Catálogo
          </Link>
        }
      />
      <nav aria-label="Filtrar por status" className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/upsells/pedidos" className={filterClass(!status)}>
          Todos
        </Link>
        {upsellOrderStatuses.map((value) => (
          <Link key={value} href={`/admin/upsells/pedidos?status=${value}`} className={filterClass(status === value)}>
            {upsellOrderStatusLabels[value]}
          </Link>
        ))}
      </nav>
      <DataTable
        columns={columns}
        rows={orders}
        rowKey={(row) => row.id}
        empty={<EmptyState title="Nenhum pedido" description="Os pedidos feitos na galeria aparecem aqui." />}
      />
    </div>
  );
}
