import { notFound } from "next/navigation";
import { getShootDetail } from "@/domain/shoots/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PaymentForm } from "./payment-form";
import { formatBRL } from "@/lib/format";

type Params = Promise<{ id: string }>;

export default async function RegisterPaymentPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await getShootDetail(id);
  if (!detail) notFound();

  return (
    <div>
      <PageHeader
        title="Registrar pagamento"
        description={`${detail.clientName} — ${detail.packageName} · saldo atual ${formatBRL(detail.balance)}`}
      />
      <Card>
        <PaymentForm shootId={id} />
      </Card>
    </div>
  );
}
