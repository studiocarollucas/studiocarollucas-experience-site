import { listFamilies } from "@/domain/catalog/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PackageForm } from "@/components/admin/catalog/package-form";

export default async function NewPackagePage() {
  const families = await listFamilies();
  return (
    <div>
      <PageHeader title="Novo pacote" description="Cadastre o que a cliente recebe e como a opção participa da curadoria." />
      <Card>
        <PackageForm families={families} />
      </Card>
    </div>
  );
}
