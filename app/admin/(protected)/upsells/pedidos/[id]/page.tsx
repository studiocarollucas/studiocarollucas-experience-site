import Link from "next/link";
import { notFound } from "next/navigation";
import type { Payment, UpsellOrderItem } from "@/db/schema";
import { getUpsellOrderDetail } from "@/domain/upsell/orders";
import { upsellOrderAcceptsPayments } from "@/domain/upsell/rules";
import { upsellPaymentStatusLabels, upsellProductKindLabels } from "@/domain/upsell/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailSection, DetailRow } from "@/components/admin/detail-section";
import { UpsellOrderStatusControl } from "@/components/admin/upsell/order-status-control";
import { UpsellOrderPaymentForm } from "@/components/admin/upsell/order-payment-form";
import { formatBRL, formatDateTime, formatShootDate } from "@/lib/format";

type Params = Promise<{ id: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const itemColumns: Column<UpsellOrderItem>[] = [
  { key: "name", header: "Produto", render: (item) => item.name },
  { key: "kind", header: "Tipo", render: (item) => upsellProductKindLabels[item.kind] },
  { key: "unitPrice", header: "Preço unitário", render: (item) => formatBRL(item.unitPrice) },
  { key: "quantity", header: "Qtd.", render: (item) => item.quantity },
  { key: "lineTotal", header: "Subtotal", className: "text-right", render: (item) => formatBRL(item.lineTotal) },
];

const paymentColumns: Column<Payment>[] = [
  { key: "amount", header: "Valor", render: (p) => formatBRL(p.amount) },
  {
    key: "status",
    header: "Status",
    render: (p) => (
      <Badge tone={p.status === "confirmado" ? "success" : p.status === "estornado" ? "danger" : "neutral"}>
        {p.status}
      </Badge>
    ),
  },
  { key: "method", header: "Forma", render: (p) => p.method ?? "—" },
  { key: "paidAt", header: "Pago em", render: (p) => (p.paidAt ? formatDateTime(p.paidAt) : "—") },
];

export default async function UpsellOrderPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const detail = await getUpsellOrderDetail(id);
  if (!detail) notFound();

  const { order, clientName, shootDate, items, payments, money, nextStatuses } = detail;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Pedido de upsell — ${clientName}`}
        description={`Solicitado em ${formatDateTime(order.createdAt.toISOString())}`}
        action={
          <Link
            href="/admin/upsells/pedidos"
            className="border border-line px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:border-ink"
          >
            Todos os pedidos
          </Link>
        }
      />

      <DetailSection title="Pedido">
        <DetailRow
          label="Cliente"
          value={
            <Link href={`/admin/clientes/${order.clientId}`} className="underline-offset-2 hover:underline">
              {clientName}
            </Link>
          }
        />
        <DetailRow
          label="Ensaio"
          value={
            <Link href={`/admin/agenda/${order.shootId}`} className="underline-offset-2 hover:underline">
              {formatShootDate(shootDate)}
            </Link>
          }
        />
        <DetailRow label="Observação da cliente" value={order.clientNotes ?? "—"} />
        <DetailRow label="Total do pedido" value={formatBRL(order.total)} />
      </DetailSection>

      <DataTable
        columns={itemColumns}
        rows={items}
        rowKey={(item) => item.id}
        empty={<EmptyState title="Sem itens" />}
      />

      <DetailSection title="Andamento">
        <UpsellOrderStatusControl orderId={order.id} status={order.status} nextStatuses={nextStatuses} />
      </DetailSection>

      <DetailSection title="Pagamento">
        <DetailRow label="Situação" value={upsellPaymentStatusLabels[money.paymentStatus]} />
        <DetailRow label="Recebido" value={formatBRL(money.paid)} />
        <DetailRow label="Saldo" value={formatBRL(money.balance)} />
      </DetailSection>

      <DataTable
        columns={paymentColumns}
        rows={payments}
        rowKey={(p) => p.id}
        empty={<EmptyState title="Nenhum pagamento" description="Os pagamentos deste pedido entram no Financeiro." />}
      />

      {upsellOrderAcceptsPayments(order.status) ? (
        <DetailSection title="Registrar pagamento">
          <UpsellOrderPaymentForm orderId={order.id} />
        </DetailSection>
      ) : (
        <p className="font-sans text-sm text-muted">
          {order.status === "cancelado"
            ? "Pedido cancelado: nenhum novo pagamento. Estornos são registrados como pagamento estornado."
            : "Confirme o pedido para registrar pagamentos."}
        </p>
      )}
    </div>
  );
}
