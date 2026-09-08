import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { getClientById } from "@/domain/clients/service";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EditClientForm } from "./edit-client-form";

type Params = Promise<{ id: string }>;

export default async function EditClientPage({ params }: { params: Params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin/login");
  if (!hasMinimumRole(currentUser.role, "staff")) {
    redirect(
      `/admin/login?error=${encodeURIComponent("Sua conta não tem permissão de acesso ao Studio OS.")}`,
    );
  }

  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  return (
    <div>
      <PageHeader title={`Editar — ${client.name}`} />
      <Card>
        <EditClientForm
          id={id}
          initialValues={{
            name: client.name,
            phone: client.phone,
            email: client.email,
            instagramHandle: client.instagramHandle,
            birthday: client.birthday,
            cpf: client.cpf,
            addressStreet: client.addressStreet,
            addressNumber: client.addressNumber,
            addressComplement: client.addressComplement,
            addressNeighborhood: client.addressNeighborhood,
            addressCity: client.addressCity,
            addressState: client.addressState,
            addressPostalCode: client.addressPostalCode,
            source: client.source,
            styleProfile: client.styleProfile,
            notes: client.notes,
            marketingConsent: client.marketingConsent,
          }}
          showContractFields
        />
      </Card>
    </div>
  );
}
