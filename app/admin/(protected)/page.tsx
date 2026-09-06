import Link from "next/link";
import { getDashboardData } from "@/domain/dashboard/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { KpiTile } from "@/components/admin/kpi-tile";
import { formatBRL } from "@/lib/format";

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

export default async function DashboardPage() {
  const range = currentMonthRange();
  const { kpis, attention } = await getDashboardData(range);

  return (
    <div>
      <PageHeader title="Dashboard" description={`Período: ${range.from} a ${range.to}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Ensaios no período" value={String(kpis.shootsInPeriod)} />
        <KpiTile label="Faturado" value={formatBRL(kpis.billed)} />
        <KpiTile label="Recebido" value={formatBRL(kpis.received)} />
        <KpiTile label="A receber" value={formatBRL(kpis.receivable)} />
        <KpiTile label="Despesas" value={formatBRL(kpis.expenses)} />
        <KpiTile label="Resultado" value={formatBRL(kpis.result)} />
        <KpiTile label="Ticket médio" value={formatBRL(kpis.averageTicket)} />
        <KpiTile
          label="Produção"
          value={String(kpis.productionInProgress)}
          sub={`${kpis.finishedShoots} finalizados · ${kpis.upcomingDeliveries} entregas vencidas`}
        />
      </div>

      <Card className="mt-8">
        <h2 className="font-serif text-lg font-light text-ink">Ações que exigem atenção</h2>
        {attention.length === 0 ? (
          <p className="mt-2 font-sans text-sm text-muted">Nada pendente no período.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {attention.map((item, i) => (
              <li key={`${item.kind}-${item.shootId}-${i}`} className="font-sans text-sm">
                <Link href={`/admin/agenda/${item.shootId}`} className="text-ink underline-offset-2 hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
