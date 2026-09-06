import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientDetail } from "@/domain/clients/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailSection, DetailRow } from "@/components/admin/detail-section";
import { formatBRL, formatShootDate } from "@/lib/format";
import type { ClientShootSummary } from "@/domain/clients/queries";

type Params = Promise<{ id: string }>;

const shootColumns: Column<ClientShootSummary>[] = [
  {
    key: "package",
    header: "Experiência",
    render: (r) => (
      <Link href={`/admin/agenda/${r.id}`} className="text-ink underline-offset-2 hover:underline">
        {r.packageName}
      </Link>
    ),
  },
  { key: "date", header: "Data", render: (r) => formatShootDate(r.shootDate) },
  { key: "status", header: "Status", render: (r) => <Badge>{r.status}</Badge> },
  { key: "price", header: "Valor", render: (r) => formatBRL(r.agreedPrice) },
  { key: "paid", header: "Pago", render: (r) => formatBRL(r.confirmedPaid) },
  {
    key: "balance",
    header: "Saldo",
    render: (r) => (
      <span className={r.balance.startsWith("-") || r.balance === "0.00" ? "text-muted" : "text-danger"}>
        {formatBRL(r.balance)}
      </span>
    ),
  },
];

export default async function ClientDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();

  const { client, shoots, lifetimeRevenue, openBalance } = detail;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={client.name}
        description={client.instagramHandle ? `@${client.instagramHandle}` : undefined}
        action={
          <Link
            href={`/admin/clientes/${id}/editar`}
            className="border border-line px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:border-ink"
          >
            Editar
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection title="Dados">
          <DetailRow label="Telefone" value={client.phone ?? "—"} />
          <DetailRow label="E-mail" value={client.email ?? "—"} />
          <DetailRow label="Aniversário" value={client.birthday ?? "—"} />
          <DetailRow label="Origem" value={client.source ?? "—"} />
          <DetailRow label="Perfil de estilo" value={client.styleProfile ?? "—"} />
          <DetailRow
            label="Consentimento de marketing"
            value={client.marketingConsent ? "Sim" : "Não"}
          />
        </DetailSection>

        <DetailSection title="Relacionamento">
          <DetailRow label="Receita acumulada" value={formatBRL(lifetimeRevenue)} />
          <DetailRow label="Saldo em aberto" value={formatBRL(openBalance)} />
          <DetailRow label="Ensaios" value={String(shoots.length)} />
          {client.notes ? (
            <p className="mt-3 whitespace-pre-wrap font-sans text-sm text-muted">{client.notes}</p>
          ) : null}
        </DetailSection>
      </div>

      <DetailSection title="Histórico de ensaios">
        <DataTable
          columns={shootColumns}
          rows={shoots}
          rowKey={(r) => r.id}
          empty={<EmptyState title="Nenhum ensaio" description="Esta cliente ainda não tem ensaios." />}
        />
      </DetailSection>
    </div>
  );
}
