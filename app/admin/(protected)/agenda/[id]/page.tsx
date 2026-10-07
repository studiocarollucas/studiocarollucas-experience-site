import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getShootDetail } from "@/domain/shoots/queries";
import { listContractsForShoot } from "@/domain/contracts/queries";
import { getShootReviewPanel } from "@/domain/reviews/queries";
import { readStylingReferences } from "@/domain/styling/read";
import { readStylingInventoryLinks } from "@/domain/styling/inventory-links";
import { logger } from "@/lib/observability/logger";
import type { StylingInventoryOption } from "@/components/admin/styling-inventory-link";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailSection, DetailRow } from "@/components/admin/detail-section";
import { ContractsList } from "@/components/admin/contracts-list";
import { ShootReview } from "@/components/admin/shoot-review";
import { StylingManager } from "@/components/admin/styling-manager";
import { EditShootPanel } from "./edit-shoot-panel";
import { ShootStatusControl } from "./shoot-status-control";
import { ProductionFieldsForm } from "./production-fields-form";
import { InventoryReservations } from "@/components/admin/inventory-reservations";
import { formatBRL, formatShootDate, formatDateTime } from "@/lib/format";
import type { Payment } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";

type Params = Promise<{ id: string }>;

const paymentColumns: Column<Payment>[] = [
  { key: "amount", header: "Valor", render: (p) => formatBRL(p.amount) },
  {
    key: "status",
    header: "Status",
    render: (p) => (
      <Badge
        tone={
          p.status === "confirmado" ? "success" : p.status === "estornado" ? "danger" : "neutral"
        }
      >
        {p.status}
      </Badge>
    ),
  },
  { key: "method", header: "Forma", render: (p) => p.method ?? "—" },
  { key: "paidAt", header: "Pago em", render: (p) => (p.paidAt ? formatDateTime(p.paidAt) : "—") },
  {
    key: "reference",
    header: "Referente a",
    // SCL-507: upsell receipts are listed here but do not count toward the Shoot balance.
    render: (p) =>
      p.upsellOrderId ? (
        <Link href={`/admin/upsells/pedidos/${p.upsellOrderId}`} className="underline-offset-2 hover:underline">
          Pedido de upsell
        </Link>
      ) : (
        "Ensaio"
      ),
  },
];

export default async function ShootDetailPage({ params }: { params: Params }) {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) redirect("/admin/login");
  if (!hasMinimumRole(currentUser.role, "staff")) {
    redirect(
      `/admin/login?error=${encodeURIComponent("Sua conta não tem permissão de acesso ao Studio OS.")}`,
    );
  }

  const { id } = await params;
  const [detail, stylingReferences, contracts, reviewPanel] = await Promise.all([
    getShootDetail(id),
    readStylingReferences(supabase, id),
    listContractsForShoot(id),
    getShootReviewPanel(id),
  ]);
  if (!detail) notFound();

  let linkedReferences = stylingReferences;
  let inventoryLinksAvailable = true;
  try {
    linkedReferences = await readStylingInventoryLinks(id, stylingReferences);
  } catch {
    inventoryLinksAvailable = false;
    logger.error("admin styling inventory links unavailable", { shootId: id });
  }
  const inventoryOptions = new Map<string, StylingInventoryOption>();
  for (const reservation of detail.inventoryReservations ?? []) {
    if (reservation.purpose !== "shoot" || !reservation.inventoryItemId ||
        (reservation.status !== "pending" && reservation.status !== "confirmed")) continue;
    const previous = inventoryOptions.get(reservation.inventoryItemId);
    if (previous?.reservationState === "confirmed") continue;
    inventoryOptions.set(reservation.inventoryItemId, {
      inventoryItemId: reservation.inventoryItemId, itemName: reservation.itemName,
      reservationState: reservation.status,
    });
  }

  const {
    shoot,
    clientName,
    clientId,
    packageName,
    payments,
    balance,
    productionJob,
    preparationTasks,
    inventoryReservations,
  } = detail;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${clientName} — ${packageName}`}
        description={`${formatShootDate(shoot.shootDate)}${shoot.startTime ? ` · ${shoot.startTime.slice(0, 5)}` : ""}`}
        action={
          <div className="flex items-start gap-2">
            <ShootStatusControl id={id} status={shoot.status} />
            <Badge
              tone={
                shoot.paymentStatus === "pago"
                  ? "success"
                  : shoot.paymentStatus === "parcial"
                    ? "warning"
                    : "neutral"
              }
            >
              {shoot.paymentStatus}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection title="Registro central">
          <DetailRow
            label="Cliente"
            value={
              <Link
                href={`/admin/clientes/${clientId}`}
                className="underline-offset-2 hover:underline"
              >
                {clientName}
              </Link>
            }
          />
          <DetailRow label="Experiência" value={packageName} />
          <DetailRow label="Ocasião" value={shoot.occasion ?? "—"} />
          <DetailRow label="Participantes" value={shoot.participantCount ?? "—"} />
          <DetailRow label="Indicação / origem" value={shoot.referral ?? "—"} />
          <DetailRow label="Portal liberado" value={shoot.portalEnabled ? "Sim" : "Não"} />
          <DetailRow label="Observações internas" value={shoot.notes ?? "—"} />
        </DetailSection>

        <DetailSection title="Financeiro">
          <DetailRow label="Valor acordado" value={formatBRL(shoot.agreedPrice)} />
          <DetailRow
            label="Saldo"
            value={
              <span
                className={
                  balance.startsWith("-") || balance === "0.00" ? "text-muted" : "text-danger"
                }
              >
                {formatBRL(balance)}
              </span>
            }
          />
          <DetailRow label="Status financeiro" value={shoot.paymentStatus} />
          <div className="mt-4">
            <Link
              href={`/admin/agenda/${id}/pagamento`}
              className="border border-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:bg-ink hover:text-white"
            >
              Registrar pagamento
            </Link>
          </div>
        </DetailSection>
      </div>

      <DetailSection title="Contratos">
        <div className="mb-4">
          <Link
            href={`/admin/agenda/${id}/contrato`}
            className="border border-ink px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-ink hover:bg-ink hover:text-white"
          >
            Gerar contrato
          </Link>
        </div>
        <ContractsList contracts={contracts} />
      </DetailSection>

      <DetailSection title="Logística para a cliente">
        <DetailRow label="Local" value={shoot.locationName ?? "—"} />
        <DetailRow label="Endereço / ponto de encontro" value={shoot.locationAddress ?? "—"} />
        <DetailRow label="Orientações para a cliente" value={shoot.clientGuidance ?? "—"} />
      </DetailSection>

      <DetailSection title="Pagamentos">
        <DataTable
          columns={paymentColumns}
          rows={payments}
          rowKey={(p) => p.id}
          empty={
            <EmptyState
              title="Sem pagamentos"
              description="Nenhum pagamento registrado para este ensaio."
            />
          }
        />
      </DetailSection>

      <DetailSection title="Produção & experiência">
        <DetailRow
          label="Job de produção"
          value={productionJob ? <Badge>{productionJob.status}</Badge> : "—"}
        />
        <DetailRow
          label="Tarefas de preparação"
          value={`${preparationTasks.filter((t) => t.status === "concluida").length}/${preparationTasks.length} concluídas`}
        />
        <div className="mt-3">
          <Link
            href={`/admin/agenda/${id}/preparacao`}
            className="font-sans text-sm text-ink underline-offset-2 hover:underline"
          >
            Abrir checklist de preparação
          </Link>
        </div>
        {productionJob ? (
          <ProductionFieldsForm
            jobId={productionJob.id}
            initialValues={{
              photosToEdit: productionJob.photosToEdit ?? undefined,
              deliveryDueAt: productionJob.deliveryDueAt ?? "",
              selectionStatus: productionJob.selectionStatus ?? "",
              notes: productionJob.notes ?? "",
            }}
          />
        ) : null}
      </DetailSection>

      <DetailSection title="Avaliação">
        <ShootReview shootId={id} panel={reviewPanel} />
      </DetailSection>

      <DetailSection title="Styling e referências">
        {!inventoryLinksAvailable ? <p role="status" className="mb-4 font-sans text-sm text-muted">
          Não foi possível carregar os vínculos com o acervo agora. Tente novamente em instantes.
        </p> : null}
        <StylingManager
          shootId={id}
          viewerAuthUserId={currentUser.id}
          references={linkedReferences}
          inventoryItems={[...inventoryOptions.values()]}
          inventoryLinksAvailable={inventoryLinksAvailable}
        />
      </DetailSection>

      <InventoryReservations shootId={id} shootDate={shoot.shootDate} reservations={inventoryReservations} />

      <DetailSection title="Editar ensaio">
        <EditShootPanel
          id={id}
          initialValues={{
            startTime: shoot.startTime ?? "",
            agreedPrice: shoot.agreedPrice,
            participantCount: shoot.participantCount ?? undefined,
            occasion: shoot.occasion ?? "",
            locationName: shoot.locationName ?? "",
            locationAddress: shoot.locationAddress ?? "",
            clientGuidance: shoot.clientGuidance ?? "",
            referral: shoot.referral ?? "",
            notes: shoot.notes ?? "",
            portalEnabled: shoot.portalEnabled,
          }}
        />
      </DetailSection>
    </div>
  );
}
