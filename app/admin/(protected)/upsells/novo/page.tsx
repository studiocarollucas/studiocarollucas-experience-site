import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { UpsellProductForm } from "@/components/admin/upsell/product-form";

export default function NewUpsellProductPage() {
  return (
    <div>
      <PageHeader title="Novo produto" description="O preço vale para novos pedidos; pedidos já feitos guardam o valor da época." />
      <Card>
        <UpsellProductForm />
      </Card>
    </div>
  );
}
