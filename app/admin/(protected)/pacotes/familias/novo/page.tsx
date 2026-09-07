import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FamilyForm } from "@/components/admin/catalog/family-form";

export default function NewFamilyPage() {
  return (
    <div>
      <PageHeader title="Nova família" description="Crie um novo tipo de ensaio para organizar seu catálogo." />
      <Card><FamilyForm /></Card>
    </div>
  );
}
