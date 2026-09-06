import { notFound } from "next/navigation";
import { getClientById } from "@/domain/clients/service";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EditClientForm } from "./edit-client-form";

type Params = Promise<{ id: string }>;

export default async function EditClientPage({ params }: { params: Params }) {
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
            source: client.source,
            styleProfile: client.styleProfile,
            notes: client.notes,
            marketingConsent: client.marketingConsent,
          }}
        />
      </Card>
    </div>
  );
}
