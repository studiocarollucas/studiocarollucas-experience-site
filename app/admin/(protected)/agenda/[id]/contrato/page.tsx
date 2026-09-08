import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DetailRow, DetailSection } from "@/components/admin/detail-section";
import { getContractIssueContext } from "@/domain/contracts/queries";
import { calculateBalance } from "@/domain/payments/balance";
import { formatBRL, formatShootDate } from "@/lib/format";
import { fromCents, sumCents } from "@/lib/money";
import { ContractIssuePanel } from "./contract-issue-panel";
import { getActiveContractorProfile } from "@/domain/contractor-profile/service";

type Params = Promise<{ id: string }>;

export default async function ContractIssuePage({ params }: { params: Params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin/login");
  if (!hasMinimumRole(currentUser.role, "staff")) {
    redirect(
      `/admin/login?error=${encodeURIComponent("Sua conta não tem permissão de acesso ao Studio OS.")}`,
    );
  }

  const { id } = await params;
  const context = await getContractIssueContext(id);
  if (!context) notFound();
  const contractorConfigured = Boolean(await getActiveContractorProfile());

  const confirmedPaid = fromCents(
    sumCents(context.payments.filter((payment) => payment.status === "confirmado").map((payment) => payment.amount)),
  );
  const balance = calculateBalance(context.shoot.agreedPrice, context.payments);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gerar contrato"
        description={`${context.client.name} — revise os dados antes da emissão.`}
      />

      <DetailSection title="Resumo do ensaio">
        <DetailRow label="Experiência" value={context.package.name} />
        <DetailRow
          label="Data"
          value={`${formatShootDate(context.shoot.date)}${context.shoot.startTime ? ` · ${context.shoot.startTime.slice(0, 5)}` : ""}`}
        />
        <DetailRow label="Local" value={context.shoot.locationName ?? "—"} />
        <DetailRow label="Endereço" value={context.shoot.locationAddress ?? "—"} />
        <DetailRow label="Valor acordado" value={formatBRL(context.shoot.agreedPrice)} />
        <DetailRow label="Confirmado pago" value={formatBRL(confirmedPaid)} />
        <DetailRow label="Saldo" value={formatBRL(balance)} />
      </DetailSection>

      <Card>
        <ContractIssuePanel
          shootId={context.shoot.id}
          contractorConfigured={contractorConfigured}
          initialCivilData={{
            cpf: context.client.cpf,
            birthday: context.client.birthday,
            addressStreet: context.client.addressStreet,
            addressNumber: context.client.addressNumber,
            addressComplement: context.client.addressComplement,
            addressNeighborhood: context.client.addressNeighborhood,
            addressCity: context.client.addressCity,
            addressState: context.client.addressState,
            addressPostalCode: context.client.addressPostalCode,
          }}
        />
      </Card>
    </div>
  );
}
