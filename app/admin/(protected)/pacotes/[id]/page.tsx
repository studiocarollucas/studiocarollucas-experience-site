import { notFound } from "next/navigation";
import { getExperiencePackageById } from "@/domain/catalog/experience-package";
import { listFamilies } from "@/domain/catalog/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PackageForm } from "@/components/admin/catalog/package-form";

type Params = Promise<{ id: string }>;

export default async function EditPackagePage({ params }: { params: Params }) {
  const { id } = await params;
  const [item, families] = await Promise.all([getExperiencePackageById(id), listFamilies()]);
  if (!item) notFound();
  return (
    <div>
      <PageHeader title={`Editar — ${item.name}`} description="As alterações são registradas e atualizam o catálogo interno." />
      <Card>
        <PackageForm families={families} initialValues={item} />
      </Card>
    </div>
  );
}
