import { notFound } from "next/navigation";
import { getExperienceFamilyById } from "@/domain/catalog/family";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FamilyForm } from "@/components/admin/catalog/family-form";

type Params = Promise<{ id: string }>;

export default async function EditFamilyPage({ params }: { params: Params }) {
  const { id } = await params;
  const family = await getExperienceFamilyById(id);
  if (!family) notFound();
  return (
    <div>
      <PageHeader title={`Editar — ${family.name}`} description="Para desativar uma família, primeiro desative os pacotes que ainda estão ativos." />
      <Card><FamilyForm initialValues={family} /></Card>
    </div>
  );
}
