import { listClientOptions } from "@/domain/clients/queries";
import { listActivePackages } from "@/domain/catalog/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { NewShootForm } from "./new-shoot-form";

export default async function NewShootPage() {
  const [clients, packages] = await Promise.all([listClientOptions(), listActivePackages()]);

  return (
    <div>
      <PageHeader
        title="Novo ensaio"
        description="Cria o ensaio, o job de produção em Aguardando e o checklist inicial — em uma única operação."
      />
      <Card>
        <NewShootForm clients={clients} packages={packages} />
      </Card>
    </div>
  );
}
